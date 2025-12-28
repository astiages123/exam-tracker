"""
HTML İşlemcisi (processor.py)
============================
Pandoc tarafından Word'den dönüştürülen ham HTML dosyalarını
profesyonel web dokümanlarına dönüştürür.

Kullanım:
    python3 tools/processor.py

Gerekli Kütüphaneler:
    pip3 install beautifulsoup4 lxml
"""

import os
import re
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString

# ============================================================================
# YAPILANDIRMA
# ============================================================================

INPUT_DIR = Path(__file__).parent.parent / "input"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "notlar"
MEDIA_PATH = "/notlar/media/"  # Görsel yollarının yönlendirileceği klasör

# CSS ve JS dosyaları
CSS_FILE = "not_stilleri.css"
JS_FILE = "notes.js"

# Kurs verileri (data.js) yolu
DATA_FILE = Path(__file__).parent.parent / "src" / "data.js"

# ============================================================================
# YARDIMCI FONKSİYONLAR
# ============================================================================

def load_course_mappings():
    """src/data.js dosyasından kurs adı -> id eşleşmelerini yükler."""
    if not DATA_FILE.exists():
        print(f"⚠️  '{DATA_FILE}' bulunamadı, otomatik isimlendirme devre dışı.")
        return {}
    
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # id: "...", name: "..." patternini bul
        pattern = re.compile(r'id:\s*"(.*?)",\s*name:\s*"(.*?)"', re.S)
        matches = pattern.findall(content)
        
        mapping = {}
        for cid, name in matches:
            # "Mikro İktisat - Bilge Beyaz" -> "mikro iktisat"
            clean_name = name.split('-')[0].strip().lower()
            mapping[clean_name] = cid
            # Tam ismi de ekle
            mapping[name.lower().strip()] = cid
        return mapping
    except Exception as e:
        print(f"⚠️  Mappping yüklenirken hata: {e}")
        return {}


def find_course_id(title, mapping):
    """Verilen başlık için en uygun ID'yi döner."""
    if not title:
        return None
        
    title_clean = title.lower().strip()
    
    # 1. Tam eşleşme (veya temizlenmiş kurs adı eşleşmesi)
    if title_clean in mapping:
        return mapping[title_clean]
    
    # 2. Alt metin eşleşmesi
    for name, cid in mapping.items():
        if title_clean in name or name in title_clean:
            return cid
            
    # 3. Özel durumlar (Mikro Ekonom -> ekonomi_1)
    if "mikro" in title_clean and "ekonom" in title_clean:
        return mapping.get("mikro iktisat")
    if "makro" in title_clean and "ekonom" in title_clean:
        return mapping.get("makro iktisat")
        
    return None

def slugify(text: str) -> str:
    """Metni URL-dostu bir anchor'a dönüştürür."""
    # Türkçe karakterleri dönüştür
    tr_map = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
    text = text.translate(tr_map)
    # Alfanümerik olmayan karakterleri tire ile değiştir
    text = re.sub(r'[^\w\s-]', '', text.lower())
    text = re.sub(r'[-\s]+', '-', text).strip('-')
    return text


def wrap_numbers_with_span(soup: BeautifulSoup) -> None:
    """
    Sayısal değerleri <span class="num"> ile sarar.
    Roboto Sans fontu için kullanılır.
    """
    # Matematik blokları ve kod bloklarını atla
    skip_tags = ['script', 'style', 'code', 'pre', 'span']
    skip_classes = ['math', 'math-block', 'num']
    
    # Sayı pattern'i: ondalık ve binlik ayracı destekler
    number_pattern = re.compile(r'(?<!\w)(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?!\w)')
    
    def process_text_node(text_node):
        if not text_node.parent:
            return
        
        parent = text_node.parent
        
        # Skip edilecek etiketleri kontrol et
        if parent.name in skip_tags:
            return
        if parent.get('class'):
            if any(c in skip_classes for c in parent.get('class')):
                return
        
        text = str(text_node)
        if not number_pattern.search(text):
            return
        
        # Yeni içerik oluştur
        new_content = []
        last_end = 0
        
        for match in number_pattern.finditer(text):
            # Önceki metin
            if match.start() > last_end:
                new_content.append(text[last_end:match.start()])
            
            # Sayı span'ı
            num_span = soup.new_tag('span')
            num_span['class'] = 'num'
            num_span.string = match.group(1)
            new_content.append(num_span)
            
            last_end = match.end()
        
        # Kalan metin
        if last_end < len(text):
            new_content.append(text[last_end:])
        
        # Orijinal text node'u değiştir
        if new_content:
            for i, item in enumerate(new_content):
                if isinstance(item, str):
                    new_content[i] = NavigableString(item)
            
            text_node.replace_with(new_content[0])
            current = new_content[0]
            for item in new_content[1:]:
                current.insert_after(item)
                current = item
    
    # Tüm text node'ları işle
    text_nodes = list(soup.find_all(string=True))
    for text_node in text_nodes:
        if isinstance(text_node, NavigableString) and not isinstance(text_node, type(soup.new_string('')).__bases__[0]):
            process_text_node(text_node)


def add_hierarchical_numbering(soup: BeautifulSoup) -> dict:
    """
    Başlıklara hiyerarşik numaralandırma ekler: 1., 1.1., 1.1.1.
    Ayrıca ToC için başlık bilgilerini döndürür.
    """
    counters = [0, 0, 0]  # h1, h2, h3 için sayaçlar
    toc_items = []
    
    # Sadece main/content içindeki başlıkları bul
    content = soup.find('main') or soup.find('body')
    if not content:
        return {'items': []}
    
    headings = content.find_all(['h1', 'h2', 'h3'])
    
    for heading in headings:
        level = int(heading.name[1]) - 1  # 0, 1, 2
        
        # Sayaçları güncelle
        counters[level] += 1
        # Alt seviye sayaçları sıfırla
        for i in range(level + 1, 3):
            counters[i] = 0
        
        # Numara oluştur
        number_parts = [str(counters[i]) for i in range(level + 1)]
        number = '.'.join(number_parts) + '.'
        
        # ID oluştur (yoksa)
        original_text = heading.get_text(strip=True)
        if not heading.get('id'):
            heading['id'] = slugify(original_text)
        
        # Numarayı başlığa ekle
        heading.insert(0, NavigableString(f"{number} "))
        
        # ToC için bilgi kaydet
        toc_items.append({
            'level': level,
            'id': heading['id'],
            'text': f"{number} {original_text}",
            'number': number
        })
    
    return {'items': toc_items}


def generate_toc(soup: BeautifulSoup, toc_data: dict) -> None:
    """
    Sol tarafa yapışan (sticky) İçindekiler menüsü oluşturur.
    """
    if not toc_data['items']:
        return
    
    # Sidebar nav oluştur
    nav = soup.new_tag('nav')
    nav['class'] = 'sidebar'
    
    # Başlık
    toc_title = soup.new_tag('h3')
    toc_title.string = 'İçindekiler'
    nav.append(toc_title)
    
    # Ana liste
    main_ul = soup.new_tag('ul')
    main_ul['class'] = 'toc-list'
    
    current_lists = {0: main_ul}
    last_level = 0
    
    for item in toc_data['items']:
        level = item['level']
        
        # Yeni liste öğesi
        li = soup.new_tag('li')
        a = soup.new_tag('a')
        a['href'] = f"#{item['id']}"
        a.string = item['text']
        li.append(a)
        
        # Seviyeye göre uygun listeye ekle
        if level == 0:
            main_ul.append(li)
            current_lists = {0: main_ul}
            last_level = 0
        elif level > last_level:
            # Alt liste oluştur
            sub_ul = soup.new_tag('ul')
            sub_ul['class'] = 'toc-sublist'
            
            # Önceki öğeye alt liste ekle
            parent_list = current_lists.get(level - 1, main_ul)
            if parent_list.contents:
                parent_list.contents[-1].append(sub_ul)
            
            sub_ul.append(li)
            current_lists[level] = sub_ul
        else:
            # Aynı veya üst seviye
            target_list = current_lists.get(level, main_ul)
            target_list.append(li)
        
        last_level = level
    
    nav.append(main_ul)
    
    # Body'nin başına ekle
    body = soup.find('body')
    if body:
        body.insert(0, nav)


def convert_examples_to_cards(soup: BeautifulSoup) -> None:
    """
    'Örnek' veya 'Soru' ile başlayan paragrafları kart yapısına dönüştürür.
    """
    content = soup.find('main') or soup.find('body')
    if not content:
        return
    
    paragraphs = content.find_all('p')
    
    for p in paragraphs:
        text = p.get_text(strip=True)
        
        # Örnek, Örnekler, Soru veya Sorular ile tam kelime olarak başlıyor mu?
        match = re.match(r'^(Örnekler|Örnek|Sorular|Soru)\b\s*(\d*):?\s*', text, re.IGNORECASE)
        if match:
            card_type = match.group(1)
            card_num = match.group(2) or ''
            
            # Kart container oluştur
            card_div = soup.new_tag('div')
            card_div['class'] = 'note-card'
            
            # Etiket
            label_span = soup.new_tag('span')
            label_span['class'] = 'example-title'
            label_span.string = f"{card_type} {card_num}".strip()
            
            # Paragrafı karta dönüştür
            p.insert_before(card_div)
            card_div.append(label_span)
            
            # Paragraf metninden etiketi çıkar
            new_text = re.sub(r'^(Örnekler|Örnek|Sorular|Soru)\b\s*\d*:?\s*', '', text, flags=re.IGNORECASE)
            p.string = new_text
            card_div.append(p)
            
            # Eğer Soru kartı bir liste içindeyse (li), çözüm listelerini de al
            parent_li = card_div.parent
            if parent_li and parent_li.name == 'li':
                # Parent li içindeki tüm içerikleri karta taşı (p'den sonraki ul'ler dahil)
                for sibling in list(parent_li.children):
                    if sibling == card_div:
                        continue
                    if hasattr(sibling, 'name') and sibling.name in ['ul', 'ol']:
                        card_div.append(sibling)
                
                # Li'yi kartla değiştir
                parent_ul = parent_li.parent
                parent_li.replace_with(card_div)
                # Boş liste kaldıysa sil
                if parent_ul and parent_ul.name in ['ul', 'ol'] and not parent_ul.find_all('li'):
                    parent_ul.decompose()
            
            # Sonraki ilgili öğeleri de karta al (math-block, liste vb.)
            next_sibling = card_div.next_sibling
            while next_sibling:
                if isinstance(next_sibling, NavigableString):
                    if next_sibling.strip():
                        break
                    next_sibling = next_sibling.next_sibling
                    continue
                
                # Yeni başlık veya paragrafla dur
                if next_sibling.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                    break
                if next_sibling.name == 'p' and re.match(r'^(Örnekler|Örnek|Sorular|Soru)\b', next_sibling.get_text(strip=True), re.IGNORECASE):
                    break
                if next_sibling.name == 'div' and 'note-card' in next_sibling.get('class', []):
                    break
                
                # Başka bir Soru içeren li varsa dur
                if next_sibling.name == 'li':
                    li_text = next_sibling.get_text(strip=True)
                    if re.match(r'^(Örnekler|Örnek|Sorular|Soru)\b', li_text, re.IGNORECASE):
                        break
                
                # Öğeyi karta taşı
                to_move = next_sibling
                next_sibling = next_sibling.next_sibling
                card_div.append(to_move)


def enhance_math_display(soup: BeautifulSoup) -> None:
    """
    Kesir içeren (\frac) satır içi matematik formüllerini tespit eder
    ve onlara 'math-frac' class'ı ekler (daha büyük görünmeleri için).
    """
    math_spans = soup.find_all('span', class_='math inline')
    for span in math_spans:
        if '\\frac' in span.get_text():
            classes = span.get('class', [])
            if 'math-frac' not in classes:
                classes.append('math-frac')
                span['class'] = classes


def wrap_tables_for_responsive(soup: BeautifulSoup) -> None:
    """
    Tabloları yatayda kaydırılabilir wrapper ile sarar.
    Hücre içi hizalamaları korur.
    """
    tables = soup.find_all('table')
    
    for table in tables:
        # Zaten sarılmış mı kontrol et
        if table.parent and table.parent.get('class') and 'table-wrapper' in table.parent.get('class'):
            continue
        
        # Wrapper oluştur
        wrapper = soup.new_tag('div')
        wrapper['class'] = 'table-wrapper'
        
        # Tabloyu wrapper ile değiştir
        table.wrap(wrapper)


def fix_image_paths(soup: BeautifulSoup) -> None:
    """
    Görsel yollarını /notes/media/ klasörüne yönlendirir.
    """
    images = soup.find_all('img')
    
    for img in images:
        src = img.get('src', '')
        if src:
            # Sadece dosya adını al
            filename = Path(src).name
            img['src'] = f"{MEDIA_PATH}{filename}"


def create_html_structure(soup: BeautifulSoup, title: str) -> None:
    """
    Doküman yapısını düzenler: head, body, main wrapper.
    """
    # Head'i güncelle veya oluştur
    head = soup.find('head')
    if not head:
        head = soup.new_tag('head')
        if soup.html:
            soup.html.insert(0, head)
    
    # Charset
    if not head.find('meta', charset=True):
        meta_charset = soup.new_tag('meta')
        meta_charset['charset'] = 'utf-8'
        head.insert(0, meta_charset)
    
    # Viewport
    if not head.find('meta', attrs={'name': 'viewport'}):
        meta_viewport = soup.new_tag('meta')
        meta_viewport['name'] = 'viewport'
        meta_viewport['content'] = 'width=device-width, initial-scale=1.0'
        head.append(meta_viewport)
    
    # Title
    title_tag = head.find('title')
    if not title_tag:
        title_tag = soup.new_tag('title')
        head.append(title_tag)
    title_tag.string = title
    
    # CSS (mevcut stilleri kaldır ve yenisini ekle)
    for old_link in head.find_all('link', rel='stylesheet'):
        old_link.decompose()
    
    css_link = soup.new_tag('link')
    css_link['rel'] = 'stylesheet'
    css_link['href'] = CSS_FILE
    head.append(css_link)
    
    # MathJax
    if not head.find('script', src=lambda x: x and 'mathjax' in x.lower()):
        mathjax = soup.new_tag('script')
        mathjax['defer'] = ''
        mathjax['src'] = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml-full.js'
        mathjax['type'] = 'text/javascript'
        head.append(mathjax)
    
    # JS
    js_script = soup.new_tag('script')
    js_script['defer'] = ''
    js_script['src'] = JS_FILE
    head.append(js_script)
    
    # Body içeriğini main wrapper'a al
    body = soup.find('body')
    if body:
        # Sidebar hariç tüm içeriği main'e taşı
        existing_sidebar = body.find('nav', class_='sidebar')
        existing_main = body.find('main')
        
        if not existing_main:
            main = soup.new_tag('main')
            main['class'] = 'content'
            
            # Sidebar hariç tüm öğeleri main'e taşı
            children = list(body.children)
            for child in children:
                if child.name == 'nav' and 'sidebar' in (child.get('class') or []):
                    continue
                if isinstance(child, NavigableString) and not child.strip():
                    continue
                main.append(child)
            
            # Sidebar varsa ondan sonra ekle
            if existing_sidebar:
                existing_sidebar.insert_after(main)
            else:
                body.append(main)


def process_html(input_path: Path, mapping: dict) -> None:
    """
    Tek bir HTML dosyasını işler.
    """
    print(f"İşleniyor: {input_path.name}")
    
    # HTML'i oku
    with open(input_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # BeautifulSoup ile parse et
    soup = BeautifulSoup(html_content, 'lxml')
    
    # Başlık al (h1 veya title)
    h1_tag = soup.find('h1')
    title_tag = soup.find('title')
    
    title = ""
    if h1_tag:
        title = h1_tag.get_text(separator=" ", strip=True)
    elif title_tag:
        title = title_tag.string
    
    if not title:
        title = input_path.stem
    
    # ID bul ve çıktı ismini belirle
    course_id = find_course_id(title, mapping)
    if course_id:
        output_name = f"{course_id}.html"
        print(f"  ✨ Eşleşti: '{title}' -> {output_name}")
    else:
        output_name = input_path.name
        
    output_path = OUTPUT_DIR / output_name
    
    # İşlem sırası önemli!
    
    # 1. Görsel yollarını düzelt
    fix_image_paths(soup)
    
    # 2. Tabloları responsive yap
    wrap_tables_for_responsive(soup)
    
    # 3. Örnek/Soru kartlarını oluştur
    convert_examples_to_cards(soup)
    
    # 3.1. Kesirli matematik formüllerini işaretle
    enhance_math_display(soup)
    
    # 4. Başlıklara hiyerarşik numaralandırma ekle ve ToC verisi al
    toc_data = add_hierarchical_numbering(soup)
    
    # 5. ToC oluştur (numaralandırmadan sonra)
    generate_toc(soup, toc_data)
    
    # 6. Sayıları span ile sar (en son, diğer işlemlerden sonra)
    # wrap_numbers_with_span(soup)  # İsteğe bağlı, performans için devre dışı
    
    # 7. HTML yapısını düzenle
    create_html_structure(soup, title)
    
    # 8. Ok işaretlerini düzelt (=> -> &rArr;)
    # Word'den gelen veya BeautifulSoup tarafından işlenen metinlerdeki okları düzeltir
    final_html = soup.prettify()
    final_html = final_html.replace("=&gt;", "&rArr;").replace("=>", "&rArr;")
    
    # Çıktıyı kaydet
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(final_html)
    
    print(f"  ✓ Kaydedildi: {output_path.name}")
    
    # 9. İşlem başarılı olduktan sonra girdi dosyasını sil
    try:
        input_path.unlink()
        print(f"  🗑  Silindi: {input_path.name}")
    except Exception as e:
        print(f"  ⚠️  Silme hatası: {input_path.name} - {e}")


def main():
    """
    Ana işlem fonksiyonu.
    input/ klasöründeki tüm HTML dosyalarını işler.
    """
    # Klasörlerin varlığını kontrol et
    if not INPUT_DIR.exists():
        INPUT_DIR.mkdir(parents=True)
        print(f"⚠️  '{INPUT_DIR}' klasörü oluşturuldu. Lütfen ham HTML dosyalarınızı buraya koyun.")
        return
    
    if not OUTPUT_DIR.exists():
        OUTPUT_DIR.mkdir(parents=True)
    
    # HTML dosyalarını bul
    html_files = list(INPUT_DIR.glob('*.html')) + list(INPUT_DIR.glob('*.htm'))
    
    if not html_files:
        print(f"⚠️  '{INPUT_DIR}' klasöründe HTML dosyası bulunamadı.")
        return
    
    # Kurs verilerini yükle
    mapping = load_course_mappings()
    
    print(f"\n🔄 {len(html_files)} dosya işlenecek...\n")
    
    for html_file in html_files:
        try:
            process_html(html_file, mapping)
        except Exception as e:
            print(f"  ✗ Hata: {html_file.name} - {e}")
    
    print(f"\n✅ İşlem tamamlandı! Çıktılar '{OUTPUT_DIR}' klasöründe.\n")


if __name__ == '__main__':
    main()
