"""
HTML İşlemcisi (processor.py)
============================
Pandoc tarafından Word'den dönüştürülen ham HTML dosyalarını
profesyonel web dokümanlarına dönüştüren ana modül.

Kullanım:
    python3 scripts/processor.py
"""

import os
import re
import shutil
import logging
import sys
from pathlib import Path
from bs4 import BeautifulSoup

# Import configurations
from processor_config import (
    config, logger, INPUT_DIR, OUTPUT_DIR, MEDIA_PATH
)

# Import handlers
from handlers.processor_handlers import (
    perform_single_pass,
    wrap_math_displays,
    normalize_example_hierarchy,
    convert_examples_to_cards,
    clean_table_blockquotes,
    cleanup_empty_tags,
    fix_math_breaks,
    add_hierarchical_numbering,
    wrap_numbers_with_span,
    process_tables
)

# Import utilities
from utils.processor_utils import (
    generate_toc,
    create_html_structure
)

def process_html_dir(course_input_dir: Path) -> bool:
    """
    Bir ders klasörünü (HTML + media) işler.
    Klasör adı direkt olarak course_id olarak kullanılır.
    """
    course_id = course_input_dir.name
    print(f"\n🔄 İşleniyor: {course_id}")
    logger.info(f"Ders işlenmeye başlandı: {course_id}")

    # 1. HTML dosyasını bul
    try:
        html_files = list(course_input_dir.glob('*.html')) + list(course_input_dir.glob('*.htm'))
        if not html_files:
            print(f"⚠️  '{course_id}' içinde HTML dosyası bulunamadı.")
            logger.warning(f"HTML dosyası bulunamadı: {course_id}")
            return False
        
        input_path = html_files[0]
    except OSError as e:
        print(f"❌ '{course_id}' klasörü okunurken hata: {e}")
        logger.error(f"Klasör okuma hatası ({course_id}): {e}")
        return False
    
    # 2. HTML'i oku ve parse et
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except UnicodeDecodeError:
        print(f"⚠️  UTF-8 okuma hatası, latin-1 deneniyor: {input_path.name}")
        logger.warning(f"UTF-8 hatası, latin-1 deneniyor: {input_path}")
        try:
            with open(input_path, 'r', encoding='latin-1') as f:
                html_content = f.read()
        except Exception as e:
            print(f"❌ Dosya okunamadı: {e}")
            logger.error(f"Dosya okuma hatası ({input_path}): {e}")
            return False
    except IOError as e:
        print(f"❌ Dosya erişim hatası: {e}")
        logger.error(f"Dosya erişim hatası ({input_path}): {e}")
        return False

    try:
        soup = BeautifulSoup(html_content, 'lxml')
        if not soup or not soup.find():
            raise ValueError("HTML parse edilemedi veya boş.")
    except Exception as e:
        print(f"❌ BeautifulSoup parse hatası: {e}")
        logger.error(f"HTML parse hatası ({course_id}): {e}")
        return False
    
    # 3. Hazırlık ve Meta Veri
    try:
        h1_tag = soup.find('h1')
        title_tag = soup.find('title')
        title = ""
        if h1_tag: title = h1_tag.get_text(separator=" ", strip=True)
        elif title_tag: title = title_tag.string
        if not title: title = course_id
            
        course_output_dir = OUTPUT_DIR / course_id
        course_output_dir.mkdir(parents=True, exist_ok=True)
        media_output_dir = course_output_dir / "media"
        media_output_dir.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        print(f"❌ Çıktı klasörü oluşturulamadı: {e}")
        logger.error(f"Dizin oluşturma hatası ({course_output_dir}): {e}")
        return False
    
    # 5. Medya dosyalarını taşı
    try:
        media_sources = [course_input_dir / "media", course_input_dir / f"{input_path.stem}_files"]
        media_count = 0
        for src_dir in media_sources:
            if src_dir.exists() and src_dir.is_dir():
                for img_file in src_dir.glob('*'):
                    if img_file.is_file():
                        shutil.move(str(img_file), str(media_output_dir / img_file.name))
                        media_count += 1
        
        if media_count > 0:
            print(f"  🖼  {media_count} görsel taşındı")
    except Exception as e:
        print(f"⚠️  Medya taşınırken hata (işlem devam ediyor): {e}")
        logger.warning(f"Medya taşıma uyarısı({course_id}): {e}")

    # 6. HTML İşlemleri
    try:
        perform_single_pass(soup)
        process_tables(soup)

        wrap_math_displays(soup)
        normalize_example_hierarchy(soup)
        convert_examples_to_cards(soup)
        clean_table_blockquotes(soup)  # Tablolar kartlara dahil edildikten SONRA temizle
        cleanup_empty_tags(soup)
        
        fix_math_breaks(soup)
        
        if config['features']['hierarchical_numbering']:
            toc_data = add_hierarchical_numbering(soup)
        else:
            toc_data = {'items': []}

        if config['features']['add_toc']:
            generate_toc(soup, toc_data)
        if config['features']['wrap_numbers']:
            wrap_numbers_with_span(soup)
        
        create_html_structure(soup, title)
        
        # Temizlik
        final_html = soup.prettify()
        if not final_html:
            raise ValueError("Prettify boş çıktı döndürdü.")

        final_html = final_html.replace("=&gt;", "&rArr;").replace("=>", "&rArr;")
        final_html = re.sub(r'\n\s*\n\s*\n+', '\n\n', final_html)
        
        # Formül koruma
        final_html = re.sub(r'([a-zA-ZığüşöçİĞÜŞÖÇ0-9])\\\(', r'\1 \\(', final_html)
        final_html = re.sub(r'([a-zA-ZığüşöçİĞÜŞÖÇ0-9])\\\[', r'\1 \\[', final_html)
        final_html = re.sub(r'\\\)([a-zA-ZığüşöçİĞÜŞÖÇ])', r'\\) \1', final_html)
        final_html = re.sub(r'\\\]([a-zA-ZığüşöçİĞÜŞÖÇ])', r'\\] \1', final_html)
        
        # 7. Kaydet
        output_path = course_output_dir / f"{course_id}.html"
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(final_html)
        
        print(f"  ✅ Başarılı: {course_id}/{course_id}.html")
        logger.info(f"Başarıyla tamamlandı: {course_id}")
        return True

    except Exception as e:
        print(f"❌ HTML işleme hatası: {e}")
        logger.error(f"HTML dönüşüm hatası ({course_id}): {e}", exc_info=True)
        return False

def main():
    """
    Ana işlem fonksiyonu.
    """
    logger.info("Script başlatıldı.")
    
    if not INPUT_DIR.exists():
        try:
            INPUT_DIR.mkdir(parents=True)
            print(f"⚠️  '{INPUT_DIR}' klasörü oluşturuldu. Ham not klasörlerini buraya koyun.")
            logger.info("Input klasörü oluşturuldu.")
        except OSError as e:
            print(f"❌ Input klasörü oluşturulamadı: {e}")
            logger.critical(f"Input klasörü hatası: {e}")
        return
    
    if not OUTPUT_DIR.exists():
        try:
            OUTPUT_DIR.mkdir(parents=True)
        except OSError as e:
            print(f"❌ Çıktı klasörü oluşturulamadı: {e}")
            logger.critical(f"Output klasörü hatası: {e}")
            return
    
    # Sadece klasörleri işle
    course_dirs = [d for d in INPUT_DIR.iterdir() if d.is_dir() and not d.name.startswith('.')]
    
    if not course_dirs:
        print(f"⚠️  '{INPUT_DIR}' klasöründe işlenecek ders klasörü bulunamadı.")
        logger.warning("İşlenecek ders bulunamadı.")
        return
    
    total_courses = len(course_dirs)
    print(f"\n🚀 {total_courses} ders işlenecek...\n")
    
    success_count = 0
    fail_count = 0
    
    for course_dir in course_dirs:
        try:
            if process_html_dir(course_dir):
                success_count += 1
            else:
                fail_count += 1
        except Exception as e:
            print(f"CRITICAL ERROR: {course_dir.name} işlenirken beklenmeyen hata: {e}")
            logger.critical(f"Kritik hata ({course_dir.name}): {e}", exc_info=True)
            fail_count += 1
            
    # Özet rapor
    print("\n" + "="*40)
    print("📊 İŞLEM ÖZETİ")
    print("="*40)
    print(f"Toplam : {total_courses}")
    print(f"Başarılı : {success_count} ✅")
    print(f"Hatalı   : {fail_count} ❌")
    
    if fail_count > 0:
        print(f"\nDetaylar için 'processor.log' dosyasına bakın.")
    print("="*40 + "\n")
    
    logger.info(f"Tamamlandı. Başarılı: {success_count}, Hatalı: {fail_count}")

if __name__ == '__main__':
    main()
