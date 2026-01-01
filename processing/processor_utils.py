"""
Yardımcı Fonksiyonlar (processor_utils.py)
=========================================
HTML yapısı oluşturma, slugify ve TOC oluşturma gibi genel yardımcı fonksiyonlar.
"""

import re
from bs4 import BeautifulSoup, NavigableString
from processor_config import TR_MAP, RE_SLUG_NON_ALPHANUM, RE_SLUG_DASHES, CSS_FILE, JS_FILE

def slugify(text: str) -> str:
    """Metni URL-dostu bir anchor'a dönüştürür."""
    text = text.translate(TR_MAP)
    text = RE_SLUG_NON_ALPHANUM.sub('', text.lower())
    text = RE_SLUG_DASHES.sub('-', text).strip('-')
    return text

def generate_toc(soup: BeautifulSoup, toc_data: dict) -> None:
    """
    Sol tarafa yapışan (sticky) İçindekiler menüsü oluşturur.
    """
    if not toc_data['items']:
        return
    
    nav = soup.new_tag('nav')
    nav['class'] = 'sidebar'
    
    toc_title = soup.new_tag('h3')
    toc_title.string = 'İçindekiler'
    nav.append(toc_title)
    
    main_ul = soup.new_tag('ul')
    main_ul['class'] = 'toc-list'
    
    current_lists = {0: main_ul}
    last_level = 0
    
    for item in toc_data['items']:
        level = item['level']
        
        li = soup.new_tag('li')
        a = soup.new_tag('a')
        a['href'] = f"#{item['id']}"
        a.string = item['text']
        li.append(a)
        
        if level == 0:
            main_ul.append(li)
            current_lists = {0: main_ul}
            last_level = 0
        elif level > last_level:
            sub_ul = soup.new_tag('ul')
            sub_ul['class'] = 'toc-sublist'
            
            parent_list = current_lists.get(level - 1, main_ul)
            if parent_list.contents:
                parent_list.contents[-1].append(sub_ul)
            
            sub_ul.append(li)
            current_lists[level] = sub_ul
        else:
            target_list = current_lists.get(level, main_ul)
            target_list.append(li)
        
        last_level = level
    
    nav.append(main_ul)
    
    body = soup.find('body')
    if body:
        body.insert(0, nav)

def create_html_structure(soup: BeautifulSoup, title: str) -> None:
    """
    Doküman yapısını düzenler: head, body, main wrapper.
    """
    head = soup.find('head')
    if not head:
        head = soup.new_tag('head')
        if soup.html:
            soup.html.insert(0, head)
    
    if not head.find('meta', charset=True):
        meta_charset = soup.new_tag('meta')
        meta_charset['charset'] = 'utf-8'
        head.insert(0, meta_charset)
    
    if not head.find('meta', attrs={'name': 'viewport'}):
        meta_viewport = soup.new_tag('meta')
        meta_viewport['name'] = 'viewport'
        meta_viewport['content'] = 'width=device-width, initial-scale=1.0'
        head.append(meta_viewport)
    
    title_tag = head.find('title')
    if not title_tag:
        title_tag = soup.new_tag('title')
        head.append(title_tag)
    title_tag.string = title
    
    if not head.find('link', href=lambda x: x and CSS_FILE in x):
        css_link = soup.new_tag('link')
        css_link['rel'] = 'stylesheet'
        css_link['href'] = f'../{CSS_FILE}'
        head.append(css_link)
    
    mathjax_config = """
    window.MathJax = {
      tex: {
        inlineMath: [['\\\\(', '\\\\)']],
        displayMath: [['\\\\[', '\\\\]']],
        processEscapes: true
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
      }
    };
    """
    
    for existing_mj in head.find_all('script'):
        if (existing_mj.get('src') and 'mathjax' in existing_mj['src'].lower()) or \
           (existing_mj.string and 'MathJax' in existing_mj.string):
            existing_mj.decompose()
            
    config_script = soup.new_tag('script')
    config_script.string = mathjax_config
    head.append(config_script)
    
    mathjax_script = soup.new_tag('script')
    mathjax_script['src'] = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml-full.js'
    mathjax_script['async'] = True
    head.append(mathjax_script)
    
    body = soup.find('body')
    if not body:
        body = soup.new_tag('body')
        if soup.html:
            soup.html.append(body)
    
    sidebar = body.find('nav', class_='sidebar')
    main = body.find('main')
    
    if not main:
        main = soup.new_tag('main')
        main['class'] = 'content'
        
        children = list(body.children)
        for child in children:
            if child == sidebar:
                continue
            if hasattr(child, 'name') and child.name:
                main.append(child.extract())
        
        if sidebar:
            sidebar.insert_after(main)
        else:
            body.append(main)
    
    if not body.find('script', src=lambda x: x and JS_FILE in x):
        notes_script = soup.new_tag('script')
        notes_script['src'] = f'../{JS_FILE}'
        body.append(notes_script)
