# Finans Matematiği

### Tek Ödemeli İşlemler

#### Basit Faiz (Simple Interest)

Faizin sadece anapara üzerinden hesaplandığı, kazanılan faizin bir sonraki döneme anaparaya eklenmediği yöntemdir.

- **Formüller**

  - **Faiz Geliri:  **
    ``` math
    I\  = \ P\  \cdot r\  \cdot t
    ```

  - **Toplam Tutar / Gelecek Değer:  **
    ``` math
    A = P \cdot (1 + r \cdot t)
    ```

- **Değişkenler**:

  - **P:** Anapara (Principtal/Present Value)

  - **r:** Yıllık Basit Faiz Oranı (Annual Simple Interest Rate)

  - $`\mathbf{t}`$**:** Zaman (Time) (Her zaman yıl cinsinden olmalı)

**:::Örnek 1:** 50.000 TL, yıllık %25 faiz oranıyla bankaya yatırılıyor.

- **3 aylık getiri:** $`I = 50.000 \cdot 0,25 \cdot \frac{3}{12} = 3.125\text{ TL}`$

- **10 günlük getiri:** $`I = 50.000 \cdot 0,25 \cdot \frac{10}{365} \approx 684,93\text{ TL}`$:::

**:::Örnek 2:** 2.500 TL ile 2 aylık mevduat hesabı açılmış ve 50 TL faiz getirisi elde edilmiştir. Yıllık faiz oranı nedir?

> 
> ``` math
> 50 = 2.500 \cdot r \cdot \frac{2}{12}
> ```
>
> ``` math
> r = \frac{50 \cdot 12}{2.500 \cdot 2} = 0,12 \Rightarrow \% 12
> ```

:::

**:::Örnek 3:** Yıllık %6 faiz oranından 3 aylığına bankaya yatırılan para 187,5 TL faiz getirmiştir. Anapara nedir?

> 
> ``` math
> 187,5 = P \cdot 0,06 \cdot \frac{3}{12}
> ```
>
> ``` math
> P = 12.500\text{ TL}
> ```

:::

#### Bileşik Faiz (Compound Interest)

Kazanılan faizin anaparaya eklenerek, yeni dönemde toplam tutar üzerinden tekrar faiz hesaplandığı yöntemdir ("Faizin faizi").

- **Formül**  
  ``` math
  A = P \cdot \left( 1 + \frac{r}{m} \right)^{n}
  ```

- **Değişkenler**:

  - **m:** Yılda kaç kez faiz işletildiği (Compound frequency).

  - **n:** Toplam dönem sayısı (Vade boyunca kaç kez faiz işleyeceği).

**:::Örnek 1:** 1.000 TL, %8 faizle 5 yıl boyunca bileşik faize yatırılıyor. Vade sonu tutarı ne olur?

- **Yıllık (m=1):** $`A = 1.000 \cdot \left( 1 + \frac{0,08}{1} \right)^{5} = 1.469,33\text{ TL}`$

- **6 Aylık (m=2, n=10):** $`A = 1.000 \cdot \left( 1 + \frac{0,08}{2} \right)^{10} = 1.480,24\text{ TL}`$

- **3 Aylık (m=4, n=20):** $`A = 1.000 \cdot \left( 1 + \frac{0,08}{4} \right)^{20} = 1.485,95\text{ TL}`$

- **Aylık (m=12, n=60):** $`A = 1.000 \cdot \left( 1 + \frac{0,08}{12} \right)^{60} = 1.489,85\text{ TL}`$ :::

**:::Örnek 2:** 12.000 TL, 10 faizlendirme devresinde 18.000 TL olmuştur. Devre faiz oranı ® kaçtır?

``` math
18.000 = 12.000 \cdot \left( 1 + \frac{r}{m} \right)^{10}
```

``` math
1,0414 \approx 1 + \frac{r}{m}
```

``` math
r\  \approx \% 4,14
```

:::

**:::Örnek 3:** 3 aylık dönemlerle, %8 faizle yatan 2.500 TL ne kadar süre sonra 2.929 TL olur?

``` math
2.929 = 2.500 \cdot \left( 1 + \frac{0,08}{4} \right)^{n}
```

``` math
1.1716 = (1,02)^{n}
```

``` math
n\  \approx 8\ Dönem
```

``` math
Her\ dönem\ 3\ ay\ olduğu\ için:\ 8 \times 3 = 24\text{ ay (2 yıl)}
```

:::

#### Sürekli Bileşik Faiz (Continuous Compounding)

Faiz hesaplama sıklığının sonsuz küçüklükte olduğu (anlık) durumdur.

- **Formül**

``` math
A = P \cdot e^{r \cdot t}
```

``` math
e:Euler\ say\imath s\imath\ ( \approx 2,718\ldots)
```

**:::Örnek 1:** 20.000 TL, %12 faizle ve sürekli bileşik faizle 5 yıl sonra ne kadar olur?

``` math
A = 20.000 \cdot e^{0,12 \cdot 5} = 20.000 \cdot e^{0,6}
```

``` math
A \approx 36.442,38\text{ TL}
```

:::

**:::Örnek 2:** Bir yatırımcı, 4 yılın sonunda hesabında 100.000 TL olmasını hedeflemektedir. Banka yıllık %10 faiz oranıyla sürekli bileşik faiz uyguladığına göre, yatırımcının bugün bankaya yatırması gereken tutar (Anapara) nedir?

``` math
{100.000 = P \cdot e^{0,10 \cdot 4}\text{
}}{100.000\  = \ P\  \cdot 1,4918
}{P \approx 67.032,00\text{ TL}}
```

:::

**:::Örnek 3:** Yıllık %6 sürekli bileşik faiz oranıyla bankaya yatırılan bir miktar paranın, 2 katına çıkması için kaç yıl geçmesi gerekir?

``` math
2x = x \cdot e^{0,06 \cdot t}
```

``` math
\ln(2) = 0,06 \cdot t \cdot \ln(e)
```

``` math
t = \frac{\ln(2)}{0,06}
```

``` math
t = \frac{0,693}{0,06} \approx 11,55\text{ Yıl}
```

:::

#### Efektif Faiz Oranı / APY (Annual Percentage Yield)

Farklı bileşik faiz sıklıklarını (aylık, yıllık, 3 aylık) kıyaslamak için kullanılan, "gerçek" yıllık getiriyi gösteren orandır.

- **Formüller**

  - **Normal Bileşik Faiz İçin:  **
    ``` math
    APY = \left( 1 + \frac{r}{m} \right)^{m} - 1
    ```

  - **Sürekli Bileşik Faiz İçin:  **
    ``` math
    APY = e^{r} - 1
    ```

**:::Örnek 1:** Nominal faiz oranı %8 ise (r=0,08), hangisi daha karlıdır?

- **6 ayda bir faiz (m=2):** $`\left( 1 + \frac{0,08}{2} \right)^{2} - 1 = \% 8,16`$

- **3 ayda bir faiz (m=4):** $`\left( 1 + \frac{0,08}{4} \right)^{4} - 1 = \% 8,24`$

- **Her ay faiz (m=12):** $`\left( 1\, + \,\frac{0,08}{12} \right)^{12}\, - \, 1 = \% 8,29`$

- **Sürekli bileşik faiz:** $`e^{0,08} - 1 \approx \% 8,32`$ (En kârlı seçenek) :::

**:::Örnek 2:** Yıllık efektif faiz %22 ise, 6 aylık devreler halindeki nominal faiz nedir?

``` math
{0,22 = \left( 1 + \frac{r}{2} \right)^{2} - 1
}{1,22 = \left( 1 + \frac{r}{2} \right)^{2}
}{1,1045 = 1 + \frac{r}{2}}
```

``` math
r\text{/}2\  = 0,1045 \Rightarrow r\  = \% 20,9\  \approx \% 21
```

:::

### Seri Ödemeli İşlemler (Anüite)

#### Anüitelerde Gelecek Değer (Future Value of Annuity)

Belirli bir süre boyunca yapılan düzenli ödemelerin, süre sonundaki faizlerle birlikte ulaşacağı toplam tutarı ifade eder. "Her ay kenara para koyarsam 10 yıl sonra ne kadarım olur?" sorusunun yanıtıdır.

- **Formül**:

``` math
FV = PMT \cdot \left\lbrack \frac{\left( 1 + \frac{r}{m} \right)^{n} - 1}{\frac{r}{m}} \right\rbrack
```

- **Değişkenler**:

  - **FV (Future Value):** Aniütenin dönem sonundaki toplam gelecek değeri.

  - **PMT (Payment):** Her dönem yapılan eşit ödeme tutarı.

  - **r:** Yıllık nominal faiz oranı.

  - **m:** Bir yıl içindeki faiz hesaplanma (bileşik faiz) sayısı (Örn: Aylık ödemeler için 12).

  - **n: **Toplam ödeme sayısı (Toplam dönem sayısı).

**:::Örnek 1:** Bir çalışan, her iki ayda bir aldığı 1500 TL tutarındaki ikramiyelerini tasarruf amacıyla bir bankaya yatırmaktadır. Banka yıllık %6 faiz uyguladığına göre, 7. yıl sonunda ne kadar para biriktirmiş olur?

``` math
FV = 1500 \times \frac{\left( 1 + \frac{0,06}{6} \right)^{6 \times 7} - 1}{\frac{0,06}{6}}\ 
```

``` math
FV \approx 77.824,41\ TL
```

:::

**:::Örnek 2:** Her yılın sonunda, yıllık %8,5 bileşik faiz getiren bir hesaba 2.000 TL yatırılmaktadır.

- **20 yılın sonunda bu anüitenin toplam değeri (gelecek değeri) ne olur?**

``` math
FV = 2.000 \cdot \left\lbrack \frac{(1 + 0,085)^{20} - 1}{0,085} \right\rbrack
```

``` math
FV\  = \ 2.000\  \cdot 48,377012\  \approx 96.754,02
```

- **Bu toplam tutarın ne kadarı faiz gelirinden oluşmaktadır?**

``` math
\text{Toplam Anapara} = PMT \cdot n = 2.000 \cdot 20 = 40.000
```

``` math
\text{Faiz Geliri} = FV - \text{Toplam Anapara}
```

``` math
96.754,02 - 40.000 = 56.754,02
```

:::

**:::Örnek 3:** 3.000 TL değerindeki bir bilgisayarı almak isteyen bir öğrenci, bu parayı biriktirmek amacıyla her ayın sonunda hesabına 250 TL yatırmaktadır. Banka aylık %1,8 bileşik faiz uyguladığına göre, öğrenci bu parayı kaç ay boyunca yatırmalıdır?

``` math
3.000 = 250 \cdot \frac{(1 + 0,018)^{n} - 1}{0,018}
```

``` math
12 \cdot 0,018 = (1,018)^{n} - 10,216 + 1 = (1,018)^{n}
```

``` math
n = \frac{\ln(1,216)}{\ln(1,018)} \approx 10,96
```

**Sonuç**: Öğrenci bu parayı yaklaşık 11 ay boyunca yatırmalıdır. :::

**:::Örnek 4:** Bir işletme bankadan aldığı 4 yıl vadeli bir borcu %14 faiz oranı üzerinden ve her yıl yatırılan 5.544 TL'lik eşit taksitler ile ödeyecektir. Borç taksitlerle değil de vade bitiminde tek seferde ödenecek olsaydı, hangi tutarda bir ödeme yapılması gerekecekti?

``` math
FV = 5544 \cdot \left\lbrack \frac{\left( 1 + \frac{0.14}{1} \right)^{4 \cdot 1} - 1}{\frac{0.14}{1}} \right\rbrack
```

``` math
FV\  = \ 27.282,82
```

:::

#### Anüitelerde Bugünkü Değer (Present Value of Annuity)

Gelecekte yapılacak bir dizi düzenli ödemenin (anüite), belirli bir faiz oranıyla bugünkü toplam değerini ifade eder. "Gelecekteki bu taksitleri bugün topluca alsaydım elime ne geçerdi?" sorusunun yanıtıdır.

- **Formül**

``` math
PV = PMT \times \left\lbrack \frac{1 - \left( 1 + \frac{r}{m} \right)^{- (n)}}{\frac{r}{m}} \right\rbrack
```

- **Değişkenler:**

  - **FV (Future Value):** Aniütenin dönem sonundaki toplam gelecek değeri.

  - **PMT (Payment):** Her dönem yapılan eşit ödeme tutarı.

  - **r:** Yıllık nominal faiz oranı.

  - **m:** Bir yıl içindeki faiz hesaplanma (bileşik faiz) sayısı (Örn: Aylık ödemeler için 12).

  - **n:** Toplam ödeme sayısı (Toplam dönem sayısı).

**:::Örnek 1:** Bir bankadan alınan 220.000 TL tutarındaki kredi, 6 yıl boyunca 3 ayda bir yapılacak eşit taksitlerle (anüite) geri ödenecektir. Yıllık nominal faiz oranı %18 olduğuna göre, her bir ay sonunda ödenmesi gereken taksit tutarı (PMT) kaç TL olmalıdır?

``` math
220.000 = PMT \times \left\lbrack \frac{1 - (1 + 0,045)^{- 24}}{0,045} \right\rbrack
```

``` math
PMT \approx 15.070,66\ TL
```

:::

**:::Örnek 2:** Bir iş makinesi piyasada 45.285 TL peşin fiyatla satılmaktadır. Alternatif olarak, her ayın sonunda 4.022 TL ödenmek üzere 12 ay vadeli taksit seçeneği sunulmaktadır. Geçerli aylık faiz oranı %1,3 olduğuna göre; makineyi peşin satın almak mı yoksa taksitli seçeneği tercih etmek mi finansal açıdan daha avantajlıdır?

``` math
PV = 4.022 \times \left\lbrack \frac{1 - (1 + 0,013)^{- 12}}{0,013} \right\rbrack
```

``` math
PV = 4.022 \times 11,0692
```

``` math
PV \approx 44.520,38\text{ TL}
```

**Sonuç**: Taksitli ödemelerin bugünkü değeri (44.520,38 TL), peşin fiyattan (45.285 TL) daha düşüktür. Bu durumda taksitle satın almak daha avantajlıdır. Çünkü taksitli seçeneğin "bugünkü maliyeti" peşin fiyattan yaklaşık 764,62 TL daha azdır. :::

**:::Örnek 3:** Bir baba, üniversiteye başlayacak olan çocuğunun okul masraflarını karşılamak amacıyla, çocuğunun 4 yıl boyunca her ayın sonunda 800 TL düzenli ödeme almasını planlamaktadır. Yıllık faiz oranı %2 olduğuna göre:

- **Baba bugün bankaya tek seferde ne kadar para yatırmalıdır?**

``` math
PV = 800 \times \left\lbrack \frac{1 - (1 + 0,0016667)^{- 48}}{0,0016667} \right\rbrack
```

``` math
PV \approx 36.864\text{ TL}
```

- **4 yıl boyunca toplam ne kadar faiz tahakkuk edecektir?**

``` math
\text{Toplam Ödeme} = 800 \times 48 = 38.400\text{ TL}
```

``` math
\text{Toplam Faiz} = \text{Toplam Ödeme} - PV
```

``` math
\text{Toplam Faiz} = 38.400 - 36.864,16 = 1.535,84\ TL
```

:::

**:::Örnek 4:** Bir bankadan araba satın almak için 15.000 dolar borç alınıyor. Bu borç, faizler dahil olmak üzere 48 eşit aylık taksitte geri ödenecektir. Banka, ödenmemiş bakiye üzerinden aylık %1 (yıllık bileşik %12) faiz uygulamaktadır. Borcun tamamını 48 ayda bitirmek için yapılması gereken aylık ödeme (taksit) miktarı ne kadardır?

``` math
PV = PMT \cdot \frac{1 - (1 + i)^{- n}}{i}
```

``` math
15.000 = PMT \cdot \frac{1 - (1 + 0,01)^{- 48}}{0,01}
```

``` math
PMT\  \approx 395,01
```

:::

**:::Örnek 5 (Anüite Karma):** Bir kişi 25 yıl boyunca her yıl bankaya eşit miktarda para yatırıyor. Banka yıllık %6,25 faiz oranını yıllık bileşik olarak uyguluyor. 25 yılın sonunda biriken para ile, sonraki 20 yıl boyunca her yıl bankadan 30.000 dolar çekiyor ve 20 yılın sonunda bakiyeyi sıfırlıyor.

- **Bu kişinin 25 yıl boyunca her yıl yatırması gereken miktar (PMT) nedir?**

  - Önce 20 yıl boyunca her yıl 30.000 TL çekebilmek için 25. yılın sonunda kasada ne kadar para olması gerektiğini buluyoruz.  
    ``` math
    {PV = PMT \cdot \left\lbrack \frac{1 - (1 + i)^{- n}}{i} \right\rbrack
    }{PV = 30.000 \cdot \left\lbrack \frac{1 - (1 + 0,0625)^{- 20}}{0,0625} \right\rbrack
    }{PV\  \approx 337.221,62}
    ```

  - 337.221,62 TL değerine ulaşmak için 25 yıl boyunca yatırılması gereken yıllık tutarı hesaplıyoruz.  
    ``` math
    {FV = PMT \cdot \left\lbrack \frac{(1 + i)^{n} - 1}{i} \right\rbrack
    }{337.221,62 = PMT \cdot \left\lbrack \frac{(1 + 0,0625)^{25} - 1}{0,0625} \right\rbrack
    }{PMT\  \approx 5.933,29}
    ```

- **45 yıllık bu süreçte kazanılan toplam faiz miktarı nedir?**

  - Kazanılan toplam faiz, bankadan çekilen toplam para ile bankaya yatırılan toplam para arasındaki farktır.

> 
> ``` math
> \text{Alınan} = 30.000 \cdot 20 = 600.000
> ```
>
> ``` math
> \text{Yatırılan} = 5.933,29 \cdot 25 \approx 148.332,25
> ```
>
> ``` math
> \text{Toplam Faiz} = 600.000 - 148.332,25 = 451.667,75
> ```

:::
