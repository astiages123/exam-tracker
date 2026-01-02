"""
DOM İşleyicileri (processor_handlers.py)
=======================================
HTML içeriğini (DOM) manipüle eden ve dönüştüren ana fonksiyonlar.
"""

import re
import unicodedata
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString

from processor_config import (
    config, MEDIA_PATH, RE_NUMBER, 
    RE_EXAMPLE, RE_QUESTION_START, RE_LABEL_ONLY, RE_LABEL_WITH_CONTENT, LABEL_STARTS
)
from utils.processor_utils import slugify

# =====================================================
# YARDIMCI FONKSİYONLAR - ÖRNEK KART TESPİTİ
# =====================================================

def has_blockquote_context(element) -> bool:
    """
    Bir elementin veya alt elemanlarının blockquote içerip içermediğini kontrol eder.
    Tablo hücreleri, liste öğeleri vb. için kullanılır.
    
    Kullanım: Bir tablonun veya listenin "örnek kontekstinde" olup olmadığını anlamak için.
    """
    if element is None:
        return False
    if hasattr(element, 'name') and element.name == 'blockquote':
        return True
    if hasattr(element, 'find'):
        return bool(element.find('blockquote'))
    return False

def should_break_example(element) -> bool:
    """
    Örnek kartının burada bitmesi gerekip gerekmediğini kontrol eder.
    
    TEMEL KURAL: Blockquote içermeyen herhangi bir element örneği bitirir.
    Liste, tablo, paragraf - hepsi blockquote içermeli, aksi halde örnek biter.
    
    Returns:
        True: Örnek kartı burada kapanmalı
        False: Örnek devam edebilir
    """
    if element is None or isinstance(element, NavigableString):
        return False
    
    tag_name = getattr(element, 'name', None)
    
    # 1. Yeni başlık = örnek kesinlikle biter
    if tag_name in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
        return True
    
    # 2. Paragraf: blockquote içermiyorsa örnek biter
    if tag_name == 'p':
        if not element.find_parent('blockquote') and not has_blockquote_context(element):
            return True
    
    # 3. Liste (ol, ul): blockquote içermiyorsa örnek biter
    if tag_name in ('ol', 'ul'):
        if not has_blockquote_context(element):
            return True
    
    # 4. Tablo: blockquote içermiyorsa örnek biter
    if tag_name == 'table':
        if not has_blockquote_context(element):
            return True
    
    # 5. table-wrapper div'i için de kontrol
    if tag_name == 'div':
        classes = element.get('class', [])
        if 'table-wrapper' in classes:
            table = element.find('table')
            if table and not has_blockquote_context(table):
                return True
    
    return False

def clean_table_blockquotes(soup: BeautifulSoup) -> None:
    """
    Tablo hücreleri içindeki blockquote etiketlerini kaldırır (unwrap).
    Bu fonksiyon, convert_examples_to_cards() sonrasında çağrılmalıdır.
    Böylece tablolar önce örnek kartlarına dahil edilir, sonra temizlenir.
    """
    for bq in soup.find_all('blockquote'):
        if bq.find_parent(['td', 'th']):
            bq.unwrap()

def wrap_numbers_with_span(soup: BeautifulSoup) -> None:
    """Sayısal değerleri <span class="num"> ile sarar."""
    SKIP_TAGS = {'script', 'style', 'code', 'pre', 'span'}
    SKIP_CLASSES = {'math', 'math-block', 'num'}

    for text_node in soup.find_all(string=True):
        if not isinstance(text_node, NavigableString) or type(text_node) is not NavigableString:
            continue
            
        if not text_node or not RE_NUMBER.search(text_node):
            continue

        parent = text_node.parent
        if not parent or parent.name in SKIP_TAGS:
            continue
            
        p_classes = parent.get('class')
        if p_classes and any(c in SKIP_CLASSES for c in (p_classes if isinstance(p_classes, list) else [p_classes])):
            continue
        
        text = str(text_node)
        new_nodes = []
        last_idx = 0
        
        for match in RE_NUMBER.finditer(text):
            start, end = match.start(), match.end()
            if start > last_idx:
                new_nodes.append(NavigableString(text[last_idx:start]))
            
            num_span = soup.new_tag('span', attrs={'class': 'num'})
            num_span.string = match.group(1)
            new_nodes.append(num_span)
            last_idx = end
            
        if last_idx < len(text):
            new_nodes.append(NavigableString(text[last_idx:]))
            
        if new_nodes:
            text_node.replace_with(new_nodes[0])
            curr = new_nodes[0]
            for node in new_nodes[1:]:
                curr.insert_after(node)
                curr = node

def add_hierarchical_numbering(soup: BeautifulSoup) -> dict:
    """Başlıklara hiyerarşik numaralandırma ekler."""
    counters = [0, 0, 0, 0]  # h1, h2, h3, h4
    toc_items = []
    
    content = soup.find('main') or soup.find('body')
    if not content:
        return {'items': []}
    
    for heading in content.find_all(['h1', 'h2', 'h3', 'h4']):
        level = int(heading.name[1]) - 1 
        
        counters[level] += 1
        for i in range(level + 1, 4):
            counters[i] = 0
        
        number = ""
        if level == 1:    # H2 -> A. B. C.
            number = chr(64 + counters[level]) + "."
        elif level >= 2:  # H3, H4 -> 1. 2. 3.
            number = str(counters[level]) + "."
        
        original_text = heading.get_text(strip=True)
        if not heading.get('id'):
            heading['id'] = slugify(original_text)
        
        if number:
            prefix_span = soup.new_tag('span', attrs={'class': 'prefix-num'})
            prefix_span.string = f"{number} "
            heading.insert(0, prefix_span)
        
        if level > 0:
            toc_items.append({
                'level': level - 1,
                'id': heading['id'],
                'text': f"{number} {original_text}".strip(),
                'number': number
            })
    
    return {'items': toc_items}

def normalize_example_hierarchy(soup: BeautifulSoup) -> None:
    """Listeleri ve blockquote'ları düzenler."""
    # 1. Nested blockquote unwrap
    for bq in soup.find_all('blockquote'):
        parent = bq.parent
        if not parent: continue
        
        if parent.name == 'blockquote':
            bq.unwrap()
            continue
            
        if parent.name == 'li':
            if not bq.find('span', class_='math display'):
                bq.unwrap()

    # NOT: Tablo içindeki blockquote'lar artık clean_table_blockquotes() fonksiyonunda
    # convert_examples_to_cards() sonrasında temizleniyor. Bu sayede tablolar önce
    # örnek kartlarına dahil edilebiliyor.

    # 2. Blockquote birleştirme
    for blockquote in soup.find_all('blockquote'):
        if not blockquote.parent:
            continue
            
        # Check parent example status
        is_parent_example = False
        is_plural_example = False
        bq_first_p = blockquote.find('p')
        if bq_first_p:
            bq_text = bq_first_p.get_text(strip=True)
            text_normalized = unicodedata.normalize('NFC', bq_text)
            match_parent = RE_EXAMPLE.match(text_normalized)
            if match_parent:
                is_parent_example = True
                if 'ler' in match_parent.group(1).lower():
                     is_plural_example = True

        curr = blockquote.next_sibling
        while curr:
            next_s = curr.next_sibling
            
            if isinstance(curr, NavigableString):
                if not curr.strip():
                    curr.extract()
                    curr = next_s
                    continue
                else:
                    break
            
            if curr.name in ('ul', 'ol') or (curr.name == 'div' and 'table-wrapper' in curr.get('class', [])) or curr.name == 'table':
                # YENİ: should_break_example kontrolü
                if should_break_example(curr):
                    break
                
                first_p = blockquote.find('p')
                is_example = False
                if first_p:
                    text_content = first_p.get_text(strip=True)
                    if RE_EXAMPLE.match(text_content) or RE_QUESTION_START.match(text_content):
                        is_example = True
                
                if is_example:
                    # Heuristic: Eğer liste elemanı sadece bold bir başlıktan oluşuyorsa
                    # bunu örneğin devamı olarak değil, yeni bir başlık/tanım olarak kabul et
                    if curr.name in ('ul', 'ol'):
                        first_li = curr.find('li')
                        if first_li:
                            first_p_li = first_li.find('p', recursive=False)
                            if first_p_li:
                                strong_tag = first_p_li.find('strong')
                                if strong_tag:
                                    # Eğer P tag'inin içeriği sadece strong tag'inden ibaretse
                                    p_text = first_p_li.get_text(strip=True)
                                    s_text = strong_tag.get_text(strip=True)
                                    if p_text == s_text:
                                        # İstisna: Eğer başlık tipik bir örnek adımı ise (Analiz, Kayıt vb.) birleştirmeye devam et
                                        step_keywords = ['Analiz', 'Kural', 'Kayıt', 'Kayd', 'Çözüm', 'Hesapla', 'Belirle', 'Yevmiye', 'Cevap', 'Yanıt']
                                        if not any(k in s_text for k in step_keywords):
                                            break

                    blockquote.append(curr.extract())
                else:
                    break
            elif curr.name == 'blockquote':
                has_math = blockquote.find('span', class_='math display') or curr.find('span', class_='math display')
                if has_math and not is_parent_example:
                    break
                    
                first_p = curr.find('p')
                if first_p:
                    text_content = first_p.get_text(strip=True)
                    if RE_EXAMPLE.match(text_content):
                        # If parent is NOT plural (e.g. "Örnekler"), stop merging separate examples
                        if not is_plural_example:
                            break
                    
                    if RE_QUESTION_START.match(text_content) and not is_parent_example:
                        break
                
                blockquote.extend(curr.contents)
                curr.decompose()
            else:
                break
            curr = next_s

def wrap_math_displays(soup: BeautifulSoup) -> None:
    """Math display'leri dışarı taşıyıp blockquote içine alır."""
    if not config['features']['enhance_math']:
        return

    displays = soup.find_all('span', class_='math display')
    
    for span in displays:
        if span.find_parent('blockquote'):
            continue
            
        parent_p = span.find_parent('p')
        if not parent_p: continue
            
        curr_node = parent_p
        
        while True:
            pli = curr_node.find_parent('li')
            if not pli: break
            
            plist = pli.parent
            if not plist or plist.name not in ('ul', 'ol'): break
                
            # List splitting logic
            new_list = soup.new_tag(plist.name)
            for sibling in list(pli.next_siblings):
                new_list.append(sibling.extract())
            
            extracted = curr_node.extract()
            plist.insert_after(extracted)
            
            if not pli.get_text(strip=True) and not pli.find(['img', 'table', 'span', 'blockquote', 'ul', 'ol']):
                pli.decompose()
            
            if new_list.contents and any(c.name == 'li' for c in new_list.contents if hasattr(c, 'name')):
                extracted.insert_after(new_list)
            
            curr_node = extracted

        if curr_node.parent:
            bq = soup.new_tag('blockquote')
            curr_node.wrap(bq)

def cleanup_empty_tags(soup: BeautifulSoup) -> None:
    """Boş tag'leri temizler."""
    for tag in soup.find_all(['ul', 'ol', 'p']):
        if not tag.get_text(strip=True) and not tag.find(['img', 'table', 'iframe', 'span', 'li']):
            tag.decompose()

def convert_examples_to_cards(soup: BeautifulSoup) -> None:
    """Örnek bloklarını kartlara dönüştürür."""
    if not config['features']['convert_examples']:
        return

    for blockquote in soup.find_all('blockquote'):
        if not blockquote.parent:
            continue

        paragraphs = blockquote.find_all('p', recursive=False)
        if not paragraphs:
            continue
            
        matches = []
        for i, p in enumerate(paragraphs):
            text = p.get_text(strip=True)
            if not text: continue

            text_normalized = unicodedata.normalize('NFC', text)
            m = RE_EXAMPLE.match(text_normalized)
            if m:
                matches.append((i, m))
        
        # Process matches
        if matches:
            # Create the note card container from the blockquote
            blockquote.name = 'div'
            blockquote['class'] = 'note-card'

            for i, match in matches:
                title_word = match.group(1).strip()
                if title_word.lower().startswith('örnek'):
                    title_word = 'Örnek' if len(title_word) == 5 else 'Örnekler'
                num = match.group(2)
                
                # Clean up extra content: remove surrounding colons and whitespace
                extra = match.group(3) if match.lastindex >= 3 and match.group(3) else ""
                if extra:
                    extra = extra.strip().lstrip(':').rstrip(':').strip()
                
                card_title = title_word
                if num:
                    card_title += f" {num}"
                if extra:
                    card_title += f": {extra}"

                # Create the title span
                title_span = soup.new_tag('span', attrs={'class': 'example-title'})
                title_span.string = card_title
                
                # Replace the original paragraph with the title span
                # Note: This removes any inner formatting of the original paragraph (like bolding)
                # which is usually desired as we are reformatting it as a title.
                paragraphs[i].replace_with(title_span)
            
            # YENİ: Örnek kartından sonra gelen siblings'leri kontrol et
            # Kesme noktasına kadar blockquote içeren elementleri karta dahil et
            current = blockquote.next_sibling
            while current:
                # Boş text node'ları atla
                if isinstance(current, NavigableString):
                    if not current.strip():
                        next_sib = current.next_sibling
                        current.extract()
                        current = next_sib
                        continue
                    else:
                        break
                
                # Kesme noktası kontrolü
                if should_break_example(current):
                    break
                
                # Eğer element blockquote içeriyorsa, karta dahil et
                if has_blockquote_context(current):
                    next_sib = current.next_sibling
                    blockquote.append(current.extract())
                    current = next_sib
                else:
                    # Blockquote içermeyen element = kesme noktası
                    break

        # Case B: Question found (Only if no examples found to avoid conflict, or handle separately?)
        # Logic preserved: If no examples were processed, check for questions.
        if not matches:
            question_p_index = -1
            for i, p in enumerate(paragraphs):
                text = p.get_text(strip=True)
                if RE_QUESTION_START.match(text):
                    question_p_index = i
                    break
            
            if question_p_index != -1:
                # Same logic for Questions - simpler single split usually
                if question_p_index == 0:
                    blockquote.name = 'div'
                    blockquote['class'] = 'note-card'
                else:
                    new_card = soup.new_tag('div', attrs={'class': 'note-card'})
                    all_children = list(blockquote.contents)
                    try:
                        split_start_index = all_children.index(paragraphs[question_p_index])
                        elements_to_move = all_children[split_start_index:]
                        for elem in elements_to_move:
                            elem_extracted = elem.extract()
                            new_card.append(elem_extracted)
                        blockquote.insert_after(new_card)
                    except ValueError:
                        pass

def fix_math_breaks(soup: BeautifulSoup) -> None:
    """Bölünmüş LaTeX ifadelerini düzeltir."""
    for span in soup.find_all('span', class_='math display'):
        content = span.get_text().strip()
        if not (content.startswith('\\[') and content.endswith('\\]')):
            continue
            
        inner = content[2:-2].strip()
        if not (inner.startswith('{') and inner.endswith('}')):
            continue
            
        parts = []
        start = 0
        depth = 0
        for i, char in enumerate(inner):
            if char == '{':
                if depth == 0: start = i
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    parts.append(inner[start:i+1])
                    
        if len(parts) > 1:
            processed = " \\\\[1.2em] ".join(parts)
            span.string = f"\\[\\begin{{aligned}} {processed} \\end{{aligned}}\\]"

def perform_single_pass(soup: BeautifulSoup) -> None:
    """Tek geçişte çoklu DOM optimizasyonları."""
    to_decompose = []
    ENHANCE_MATH = config['features']['enhance_math']
    
    for tag in soup.find_all(True):
        name = tag.name
        
        if name == 'style':
            to_decompose.append(tag)
            continue
            
        # Style cleaning
        new_classes = []
        if tag.has_attr('style'):
            style = tag['style'].lower()
            if 'text-align' in style:
                if 'right' in style: new_classes.append('text-right')
                elif 'center' in style: new_classes.append('text-center')
                elif 'left' in style: new_classes.append('text-left')
            del tag['style']
            
        if tag.has_attr('align'):
            align = tag['align'].lower()
            if align in ('right', 'center', 'left'):
                new_classes.append(f'text-{align}')
            del tag['align']
            
        if new_classes:
            classes = tag.get('class', [])
            if isinstance(classes, str): classes = [classes]
            elif classes is None: classes = []
            for nc in new_classes:
                if nc not in classes: classes.append(nc)
            tag['class'] = classes

        # Tag specific
        if name == 'p':
            if not tag.contents:
                to_decompose.append(tag)
                continue
            
            first_string = next(tag.stripped_strings, None)
            if first_string is None:
                if not tag.find(['img', 'iframe', 'div']):
                    to_decompose.append(tag)
                continue
            
            if first_string.lower().startswith(LABEL_STARTS):
                if not tag.find('span', class_=['question-title', 'solution-title']):
                    text = tag.get_text(strip=True)
                    match = RE_LABEL_ONLY.match(text)
                    if match:
                        label_type = match.group(1).title()
                        label_num = match.group(2) or ''
                        label_extra = match.group(3).strip() if match.re.groups >= 3 and match.group(3) else ''
                        
                        span = soup.new_tag('span')
                        span['class'] = 'question-title' if 'soru' in label_type.lower() else 'solution-title'
                        full_label = f"{label_type} {label_num}{(' ' + label_extra) if label_extra else ''}:"
                        span.string = full_label
                        tag.clear()
                        tag['class'] = (tag.get('class', []) or []) + ['no-indent']
                        tag.append(span)
                    else:
                        match = RE_LABEL_WITH_CONTENT.match(text)
                        if match:
                            label_type = match.group(1).title()
                            label_num = match.group(2) or ''
                            
                            groups = match.groups()
                            if len(groups) >= 4:
                                label_extra = groups[2].strip() if groups[2] else ''
                                remaining = groups[3].strip()
                            else:
                                remaining = groups[2].strip()
                                label_extra = ''

                            span = soup.new_tag('span')
                            span['class'] = 'question-title' if 'soru' in label_type.lower() else 'solution-title'
                            full_label = f"{label_type} {label_num}{(' ' + label_extra) if label_extra else ''}:"
                            span.string = full_label
                            tag.clear()
                            tag['class'] = (tag.get('class', []) or []) + ['no-indent']
                            tag.append(span)
                            if remaining:
                                new_p = soup.new_tag('p')
                                new_p.string = remaining
                                tag.insert_after(new_p)
                                
        elif name == 'img':
            src = tag.get('src', '')
            if src:
                tag['src'] = f"{MEDIA_PATH}{Path(src).name}"
            
            alt = tag.get('alt', '')
            if 'PLOTLY_JSON:' in alt or 'PLOTLY_MULTI_JSON:' in alt:
                tag['alt'] = "Grafik"
                
            parent = tag.parent
            if parent and parent.name == 'p' and not parent.get_text(strip=True):
                p_classes = parent.get('class', [])
                if isinstance(p_classes, str): p_classes = [p_classes]
                elif p_classes is None: p_classes = []
                for c in ('no-indent', 'text-center'):
                    if c not in p_classes: p_classes.append(c)
                parent['class'] = p_classes
                
        elif name == 'table':
            parent = tag.parent
            if not (parent and parent.name == 'div' and 'table-wrapper' in parent.get('class', [])):
                wrapper = soup.new_tag('div')
                wrapper['class'] = 'table-wrapper'
                tag.wrap(wrapper)
                
        elif name == 'span' and ENHANCE_MATH:
            t_classes = tag.get('class', [])
            if t_classes and 'math' in t_classes and 'inline' in t_classes:
                if '\\frac' in tag.get_text():
                    if 'math-frac' not in t_classes:
                        t_classes.append('math-frac')
                        tag['class'] = t_classes
                        
        elif name == 'br':
            next_s = tag.next_sibling
            if next_s and next_s.name == 'br':
                to_decompose.append(tag)

    for t in to_decompose:
        if t.parent:
            t.decompose()

def process_tables(soup: BeautifulSoup) -> None:
    """
    Tablolardaki H4 içeren satırları TH'ye dönüştürür.
    Ancak satırları oldukları yerde bırakır (thead'e taşımaz).
    """
    for table in soup.find_all('table'):
        # Tablo içindeki tüm satırları (tr) topla
        rows = table.find_all('tr')
        if not rows:
            continue

        # Satırları tara
        for tr in rows:
            # Satırda h4 var mı?
            if tr.find('h4'):
                # Bu satır başlık olmalı
                # 1. Satıra özel sınıf ekle
                classes = tr.get('class', [])
                if isinstance(classes, str):
                    classes = [classes]
                if 'section-header' not in classes:
                    classes.append('section-header')
                tr['class'] = classes

                # 2. Hücreleri (td) th'ye çevir ve h4'ü kaldır
                for cell in tr.find_all(['td', 'th']):
                    cell.name = 'th'
                    
                    # H4'ü unwrap et (içeriği kalsın, tag gitsin)
                    h4 = cell.find('h4')
                    if h4:
                        h4.unwrap()
