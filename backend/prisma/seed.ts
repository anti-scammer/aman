/**
 * Seed data: 6 bilingual awareness articles, 8 bilingual quiz questions,
 * 16 APPROVED + 2 PENDING sample community reports.
 *
 * Run with: npm run seed
 */
import { PrismaClient } from '@prisma/client';
import { normalizeReportValue, ReportType } from '../src/lib/normalize';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

const articles = [
  {
    slug: 'prize-scams',
    category: 'PRIZE_SCAM',
    titleAr: '«مبروك، ربحت جائزة من جوال!» — كيف يعمل احتيال الجوائز الوهمية؟',
    titleEn: '"Congratulations, you won a prize from Jawwal!" — How fake prize scams work',
    summaryAr: 'رسائل الفوز بجوائز لم تشارك بها أصلًا هي أكثر أنواع الاحتيال انتشارًا في فلسطين. تعلّم كيف تكشفها قبل أن تدفع «رسوم الاستلام».',
    summaryEn: 'Messages about prizes you never entered to win are the most common scam in Palestine. Learn to spot them before paying a "collection fee".',
    bodyAr: `## كيف تبدأ الخدعة؟

تصلك رسالة SMS أو واتساب تقول: «مبروك! تم اختيار رقمك في السحب الشهري لشركة جوال وربحت 10,000 شيكل». الرسالة تبدو رسمية: شعار الشركة، لغة حماسية، ورابط «لاستلام الجائزة». المشكلة الوحيدة؟ أنت لم تشارك في أي سحب.

## ماذا يريد المحتال؟

الهدف دائمًا واحد من اثنين:

1. **أموالك مباشرة:** يُطلب منك دفع «رسوم توصيل» أو «رسوم تفعيل الجائزة» — عادة بين 50 و300 شيكل — عبر تحويل رصيد أو محفظة إلكترونية. بعد الدفع يختفي المحتال، أو يطلب مبلغًا إضافيًا بحجة «مشكلة في التحويل».
2. **بياناتك:** الرابط يقودك لصفحة تقلّد موقع جوال أو أوريدو وتطلب رقم هويتك، رقم بطاقتك البنكية، أو رمز تحقق وصلك — وبهذه البيانات يسرقون حسابك فعليًا.

## علامات تكشف الاحتيال فورًا

- **لم تشارك بأي سحب:** الشركات لا توزع جوائز على أرقام عشوائية.
- **طلب دفع مقابل جائزة:** الجائزة الحقيقية لا تحتاج أن تدفع لتستلمها. أبدًا.
- **رابط غريب:** النطاق الرسمي لجوال هو jawwal.ps — أي شيء مثل jawwal-prize.win أو رابط مختصر (bit.ly) هو احتيال.
- **الاستعجال:** «الجائزة تنتهي خلال 24 ساعة!» — الضغط النفسي أداة المحتال الأساسية.
- **أخطاء لغوية** وصياغة ركيكة في رسالة يُفترض أنها من شركة كبرى.

## ماذا تفعل؟

لا ترد، لا تضغط الرابط، ولا تحول أي مبلغ. تحقق من الرقم والرابط في منصتنا، وأبلغ عنهما ليستفيد غيرك. وإن أردت التأكد، اتصل بخدمة زبائن الشركة على رقمها الرسمي (مثلًا 111 لجوال) واسأل مباشرة — سيؤكدون لك أنه لا يوجد سحب من هذا النوع.

تذكر القاعدة الذهبية: **إذا طُلب منك أن تدفع لتربح، فأنت الجائزة.**`,
    bodyEn: `## How the trick starts

You receive an SMS or WhatsApp message: "Congratulations! Your number was selected in Jawwal's monthly draw and you won 10,000 NIS." It looks official: company logo, excited language, and a link to "claim your prize". The only problem? You never entered any draw.

## What does the scammer want?

The goal is always one of two things:

1. **Your money, directly:** You are asked to pay a "delivery fee" or "prize activation fee" — usually 50 to 300 NIS — via credit transfer or an e-wallet. Once you pay, the scammer disappears, or asks for another payment because of a "transfer problem".
2. **Your data:** The link leads to a page imitating Jawwal's or Ooredoo's website, asking for your ID number, bank card details, or a verification code you just received — with that, they can take over your real accounts.

## Signs that expose the scam instantly

- **You never entered a draw:** companies do not hand out prizes to random numbers.
- **Paying to receive a prize:** a real prize never requires payment. Ever.
- **A strange link:** Jawwal's official domain is jawwal.ps — anything like jawwal-prize.win or a shortened link (bit.ly) is fraud.
- **Urgency:** "The prize expires in 24 hours!" — psychological pressure is the scammer's main tool.
- **Bad grammar** in a message supposedly sent by a major company.

## What should you do?

Don't reply, don't click, don't transfer anything. Check the number and the link on this platform, then report them so others benefit. If you want to be sure, call the company's official customer service (e.g. 111 for Jawwal) and ask directly — they will confirm there is no such draw.

Remember the golden rule: **if you must pay to win, you are the prize.**`,
  },
  {
    slug: 'bank-phishing',
    category: 'BANK_PHISHING',
    titleAr: 'التصيّد المصرفي: صفحات مزيفة لبنك فلسطين وPalPay وJawwal Pay',
    titleEn: 'Bank phishing: fake pages for Bank of Palestine, PalPay and Jawwal Pay',
    summaryAr: 'كيف يصنع المحتالون نسخًا مقلدة من مواقع البنوك والمحافظ الفلسطينية، وكيف تتحقق من أي رابط قبل إدخال بياناتك.',
    summaryEn: 'How scammers clone Palestinian bank and wallet websites, and how to verify any link before entering your credentials.',
    bodyAr: `## ما هو التصيّد المصرفي؟

التصيّد (Phishing) هو انتحال صفة جهة مالية موثوقة — بنك فلسطين، البنك العربي، PalPay، Jawwal Pay، Reflect — لخداعك حتى تُدخل بياناتك بنفسك في صفحة مزيفة. لا يخترق المحتال البنك؛ هو يخترقك أنت.

## السيناريو المعتاد

1. تصلك رسالة: «تم إيقاف حسابك مؤقتًا لأسباب أمنية. اضغط هنا لتحديث بياناتك خلال 24 ساعة وإلا سيُغلق نهائيًا».
2. الرابط يفتح صفحة تشبه موقع البنك تمامًا: نفس الألوان والشعار وحتى نموذج تسجيل الدخول.
3. تُدخل اسم المستخدم وكلمة السر — فتذهب مباشرة إلى المحتال.
4. أحيانًا تطلب الصفحة أيضًا رمز التحقق OTP الذي وصلك للتو، وبه يُكمل المحتال تحويل أموالك.

## كيف تكشف الصفحة المزيفة؟

- **افحص النطاق حرفًا حرفًا:** bankofpalestine.com هو الرسمي؛ أما bankofpalestine-secure.top أو bop-verify.xyz فمزيفة، مهما بدت الصفحة مقنعة.
- **البنوك لا تراسلك بروابط تسجيل دخول:** لا عبر SMS ولا واتساب ولا بريد. أي رسالة كهذه مزيفة تلقائيًا.
- **التهديد والاستعجال:** «خلال 24 ساعة»، «سيُغلق حسابك» — البنوك الحقيقية لا تهدد عملاءها بهذه الطريقة.
- **HTTPS وحده لا يكفي:** وجود القفل لا يعني أن الموقع أصلي؛ المحتالون يحصلون على شهادات تشفير بسهولة.

## القواعد الذهبية

- ادخل لموقع بنكك بكتابة العنوان بنفسك أو من التطبيق الرسمي فقط.
- لا تشارك كلمة السر أو رقم البطاقة أو CVV مع أي جهة — موظف البنك الحقيقي لا يطلبها.
- عند أي شك، اتصل بفرعك مباشرة على الرقم المعروف.
- إذا أدخلت بياناتك في صفحة مشبوهة: غيّر كلمة السر فورًا واتصل بالبنك لتجميد البطاقة، ثم أبلغ عن الرابط هنا.`,
    bodyEn: `## What is bank phishing?

Phishing means impersonating a trusted financial institution — Bank of Palestine, Arab Bank, PalPay, Jawwal Pay, Reflect — to trick you into typing your credentials into a fake page yourself. The scammer doesn't hack the bank; they hack you.

## The usual scenario

1. You get a message: "Your account has been temporarily suspended for security reasons. Click here to update your details within 24 hours or it will be permanently closed."
2. The link opens a page that looks exactly like the bank's site: same colors, logo, even the login form.
3. You enter your username and password — which go straight to the scammer.
4. Sometimes the page also asks for the OTP code you just received, letting the scammer complete a transfer of your money.

## How to expose a fake page

- **Inspect the domain letter by letter:** bankofpalestine.com is official; bankofpalestine-secure.top or bop-verify.xyz are fake, no matter how convincing the page looks.
- **Banks never send login links:** not by SMS, WhatsApp, or email. Any such message is automatically fake.
- **Threats and urgency:** "within 24 hours", "your account will be closed" — real banks do not threaten customers this way.
- **HTTPS alone proves nothing:** the padlock doesn't mean the site is genuine; scammers obtain TLS certificates easily.

## Golden rules

- Reach your bank by typing the address yourself or using the official app only.
- Never share your password, card number, or CVV — a real bank employee never asks for them.
- When in doubt, call your branch on its known number.
- If you entered your details on a suspicious page: change your password immediately, call the bank to freeze the card, then report the link here.`,
  },
  {
    slug: 'otp-theft',
    category: 'OTP_THEFT',
    titleAr: 'رمز التحقق OTP: الرقم الذي يجب ألا يعرفه أحد غيرك',
    titleEn: 'The OTP code: the number nobody else should ever know',
    summaryAr: 'لماذا يلحّ المحتالون على معرفة «الرمز الذي وصلك»؟ لأن هذا الرمز هو مفتاح حسابك البنكي وواتساب بريدك. إليك كيف يسرقونه.',
    summaryEn: 'Why do scammers insist on "the code you just received"? Because that code is the key to your bank account, WhatsApp and email. Here is how they steal it.',
    bodyAr: `## ما هو رمز التحقق ولماذا هو ثمين؟

رمز التحقق لمرة واحدة (OTP) هو الرقم المكوّن من 4–6 خانات الذي يصلك برسالة عند تسجيل الدخول أو إجراء تحويل. هو خط الدفاع الأخير عن حساباتك: من يملك كلمة السر **والرمز** يملك الحساب. لهذا لا يحاول المحتال تخمينه — بل يقنعك أنت بإرساله له.

## حيل شائعة لسرقة الرمز

- **انتحال صفة البنك:** «نلاحظ عملية مشبوهة على حسابك، أرسل الرمز الذي وصلك الآن لإلغائها». الحقيقة: الرمز الذي وصلك هو لتأكيد تحويلٍ بدأه المحتال من حسابك!
- **سرقة واتساب:** «مرحبًا، أنا صديقك فلان، أرسلت لك رمزًا بالغلط، ممكن ترسله لي؟» — بهذا الرمز يسجل المحتال دخوله إلى واتساب **الخاص بك**، ثم يستخدم حسابك لخداع كل معارفك وطلب المال منهم.
- **موظف دعم مزيف:** يتصل شخص يدّعي أنه من جوال أو PalPay ويطلب «تأكيد هويتك» عبر قراءة الرمز.
- **صفحات تصيّد** تطلب الرمز مباشرة بعد كلمة السر.

## القاعدة الوحيدة التي تحتاجها

**رمز التحقق لا يُشارك مع أي إنسان، تحت أي ظرف.** لا مع «موظف البنك»، لا مع «الدعم الفني»، لا مع صديق، لا مع قريب. الجهة التي أرسلت الرمز لا تحتاج أن تسأله منك — هي أصلًا من أنشأته.

## إذا شاركت الرمز بالفعل

1. اتصل بالبنك فورًا وجمّد الحساب والبطاقات.
2. غيّر كلمات السر لكل الحسابات المرتبطة برقمك.
3. في واتساب: أعد تسجيل الدخول برقمك فورًا (يطرد المحتال) وفعّل «التحقق بخطوتين».
4. حذّر معارفك أن حسابك قد يكون مخترقًا، وأبلغ عن الرقم المحتال في منصتنا.`,
    bodyEn: `## What is an OTP and why is it precious?

A one-time password (OTP) is the 4–6 digit code you receive by SMS when logging in or making a transfer. It is the last line of defense for your accounts: whoever has the password **and the code** owns the account. That's why scammers don't try to guess it — they convince you to hand it over.

## Common tricks to steal the code

- **Bank impersonation:** "We noticed a suspicious transaction on your account, send us the code you just received to cancel it." The truth: that code arrived to confirm a transfer the scammer just initiated from your account!
- **WhatsApp takeover:** "Hi, it's your friend — I sent you a code by mistake, can you forward it?" With that code the scammer logs into **your** WhatsApp, then uses your account to ask all your contacts for money.
- **Fake support agents:** someone calls claiming to be from Jawwal or PalPay and asks to "verify your identity" by reading out the code.
- **Phishing pages** that ask for the OTP right after your password.

## The only rule you need

**An OTP is never shared with any human being, under any circumstances.** Not with a "bank employee", not with "technical support", not with a friend or relative. The party that sent the code never needs to ask you for it — they generated it.

## If you already shared it

1. Call your bank immediately and freeze the account and cards.
2. Change the passwords of every account linked to your number.
3. On WhatsApp: re-register with your number right away (it kicks the scammer out) and enable two-step verification.
4. Warn your contacts that your account may be compromised, and report the scammer's number on this platform.`,
  },
  {
    slug: 'fake-online-shops',
    category: 'FAKE_SHOP',
    titleAr: 'المتاجر الوهمية على فيسبوك وإنستغرام: بضاعة لن تصل أبدًا',
    titleEn: 'Fake shops on Facebook and Instagram: goods that will never arrive',
    summaryAr: 'صفحات تبيع هواتف وملابس بأسعار خيالية، تطلب الدفع المسبق ثم تختفي. كيف تميز المتجر الحقيقي من الوهمي قبل أن تدفع؟',
    summaryEn: 'Pages selling phones and clothes at unbelievable prices, demanding prepayment, then vanishing. How to tell a real shop from a fake one before you pay.',
    bodyAr: `## الطُعم: سعر لا يُقاوم

«آيفون 15 بـ1,200 شيكل فقط — تصفية نهاية الموسم!». صفحة أنيقة على فيسبوك أو إنستغرام، صور احترافية (مسروقة من متاجر حقيقية)، وتعليقات مليئة بالشكر (من حسابات وهمية). السعر أقل من نصف سعر السوق — وهذا تحديدًا هو الفخ: لا أحد يبيع بخسارة 50%.

## كيف يكتمل الاحتيال؟

يطلب «المتجر» الدفع المسبق كاملًا أو عربونًا عبر تحويل بنكي أو محفظة إلكترونية أو رصيد، بحجة «حجز القطعة» أو «الشحن من الخارج». بعد الدفع: إما حظر فوري، أو مماطلة بأعذار («الشحنة عالقة في الجمارك — ندفع رسوم إضافية؟») لسحب المزيد منك، ثم تختفي الصفحة كليًا وتُفتح بأسم جديد.

## افحص المتجر قبل الدفع

- **عمر الصفحة:** في «معلومات الصفحة» على فيسبوك ترى تاريخ الإنشاء وتغييرات الاسم. صفحة عمرها أسابيع وغيّرت اسمها ثلاث مرات؟ ابتعد.
- **الدفع عند الاستلام:** المتجر المحلي الحقيقي يقبله غالبًا. رفض الاستلام المسبق كليًا مع طلب تحويل فوري إشارة خطر قوية.
- **عنوان فعلي ورقم ثابت:** هل يوجد عنوان محل يمكن زيارته؟ رقم يرد عليه أحد؟
- **ابحث عن الاسم + «نصب»:** غالبًا ستجد ضحايا سبقوك يحذرون منه، وابحث في قاعدة البلاغات في منصتنا.
- **صور مسروقة:** ابحث عن الصورة عكسيًا (Google Images) — إن ظهرت في مواقع أجنبية فالبضاعة غير موجودة أصلًا.

## إذا وقعت في الفخ

احتفظ بلقطات شاشة للمحادثة وإيصال التحويل، أبلغ فيسبوك عن الصفحة، وأبلغ عنها هنا ليتجنبها الآخرون، وراجع الشرطة (وحدة الجرائم الإلكترونية) إذا كان المبلغ كبيرًا.`,
    bodyEn: `## The bait: an irresistible price

"iPhone 15 for only 1,200 NIS — end-of-season clearance!" A polished Facebook or Instagram page, professional photos (stolen from real stores), and comments full of thanks (from fake accounts). The price is under half the market rate — and that is exactly the trap: nobody sells at a 50% loss.

## How the scam plays out

The "shop" demands full prepayment or a deposit via bank transfer, e-wallet or phone credit, claiming it "reserves the item" or covers "overseas shipping". After you pay: either an instant block, or stalling with excuses ("the shipment is stuck at customs — can you pay an extra fee?") to extract more, until the page vanishes entirely and reopens under a new name.

## Inspect the shop before paying

- **Page age:** Facebook's "Page transparency" shows the creation date and name changes. A page that is weeks old and renamed three times? Walk away.
- **Cash on delivery:** genuine local shops usually accept it. Refusing it entirely while demanding an instant transfer is a strong red flag.
- **A physical address and landline:** is there a shop you could visit? A number someone answers?
- **Search the name + "scam" (نصب):** you will often find earlier victims warning about it — and search our reports database too.
- **Stolen photos:** reverse-search the images (Google Images) — if they appear on foreign sites, the goods never existed.

## If you fell for it

Keep screenshots of the chat and the transfer receipt, report the page to Facebook, report it here so others avoid it, and go to the police cybercrime unit if the amount is significant.`,
  },
  {
    slug: 'fake-job-offers',
    category: 'JOB_SCAM',
    titleAr: 'عروض العمل الوهمية: وظيفة الأحلام التي تكلفك مالك',
    titleEn: 'Fake job offers: the dream job that costs you money',
    summaryAr: 'وظائف براتب خيالي من المنزل أو في الخارج، لكنها تبدأ بطلب «رسوم تسجيل». كيف تفحص عرض العمل قبل أن تدفع أو تشارك بياناتك؟',
    summaryEn: 'Jobs with amazing pay, from home or abroad — but they start with a "registration fee". How to vet a job offer before paying or sharing your data.',
    bodyAr: `## لماذا ينجح احتيال الوظائف عندنا؟

مع نسب البطالة المرتفعة في فلسطين، رسالة تعرض «عمل من المنزل براتب 300 دولار أسبوعيًا» أو «عقد عمل جاهز في الخليج أو تركيا» تجد آذانًا مصغية. المحتالون يعرفون ذلك تمامًا، ويستهدفون الخريجين الجدد والباحثين عن عمل عبر واتساب وتيليغرام وإعلانات فيسبوك.

## الأشكال الشائعة

- **رسوم مقدمة:** «وظيفة مضمونة، فقط ادفع 200 شيكل رسوم تسجيل/فحص ملف/تأشيرة». بعد الدفع يختفون أو يطلبون رسومًا جديدة.
- **مهمات الإعجابات:** «اربح 50 شيكل يوميًا بعمل لايك للفيديوهات». يدفعون لك مبالغ صغيرة أولًا لكسب ثقتك، ثم يطلبون «شحن رصيد مهمات» بمئات الشواكل لفتح «مستوى أعلى» — وهنا تخسر كل شيء.
- **سرقة بيانات:** «أرسل صورة الهوية وجواز السفر ورقم الحساب البنكي لإكمال التعيين» — بياناتك تُستخدم لاحقًا في عمليات انتحال شخصية.
- **عقود خارجية وهمية:** عقد مزور بشعار شركة حقيقية في الخليج، والمطلوب «رسوم تصديق ومحامي».

## كيف تفحص أي عرض عمل؟

- **الشركة الحقيقية لا تأخذ منك مالًا لتوظفك.** هذه القاعدة تحسم 90% من الحالات.
- الراتب المبالغ فيه لعمل بلا خبرة ولا مقابلة؟ لا يوجد شيء اسمه راتب مرتفع مقابل «لايكات».
- ابحث عن الشركة: موقع رسمي؟ سجل تجاري؟ هل الإيميل رسمي أم Gmail عادي؟
- المقابلة كلها على واتساب/تيليغرام دون مكالمة فيديو أو مقابلة حقيقية؟ إشارة خطر.
- لا ترسل صورة هويتك أو جوازك قبل التأكد التام من الجهة.

## تذكّر

الوظيفة الحقيقية تدفع لك، لا العكس. أي «فرصة» تبدأ بدفعك أنت للمال هي احتيال حتى يثبت العكس. أبلغ عن الأرقام والصفحات التي تروج لهذه العروض في منصتنا.`,
    bodyEn: `## Why do job scams work so well here?

With high unemployment in Palestine, a message offering "work from home, $300 a week" or "a ready work contract in the Gulf or Turkey" finds willing ears. Scammers know this well and target fresh graduates and job seekers via WhatsApp, Telegram and Facebook ads.

## Common variants

- **Upfront fees:** "Guaranteed job — just pay 200 NIS for registration / file screening / visa." After you pay, they vanish or invent new fees.
- **Like-and-earn tasks:** "Earn 50 NIS a day liking videos." They pay you small amounts at first to win your trust, then require you to "deposit task credit" worth hundreds of shekels to unlock a "higher level" — and that is where you lose everything.
- **Data harvesting:** "Send your ID, passport and bank account number to complete the hiring" — your documents are later used for identity fraud.
- **Fake overseas contracts:** a forged contract bearing a real Gulf company's logo, with "notarization and lawyer fees" required.

## How to vet any job offer

- **A real employer never takes money from you to hire you.** This rule settles 90% of cases.
- Exceptional pay for no experience and no interview? There is no such thing as a high salary for "likes".
- Research the company: official website? commercial registration? Is the email a corporate one or plain Gmail?
- The whole "interview" happens on WhatsApp/Telegram with no video call? Red flag.
- Never send your ID or passport photos before fully verifying the employer.

## Remember

A real job pays you — not the other way around. Any "opportunity" that starts with you paying money is a scam until proven otherwise. Report the numbers and pages promoting these offers on this platform.`,
  },
  {
    slug: 'charity-scams',
    category: 'CHARITY_SCAM',
    titleAr: 'احتيال التبرعات: حين يتاجر المحتالون بطيبة قلبك',
    titleEn: 'Charity scams: when scammers trade on your kindness',
    summaryAr: 'حملات تبرع مزيفة لحالات مرضية وإغاثة تستغل كرم الناس، خصوصًا في رمضان وأوقات الأزمات. كيف تتبرع بأمان وتضمن وصول مالك لمستحقيه؟',
    summaryEn: 'Fake donation campaigns for medical cases and relief exploit people\'s generosity, especially in Ramadan and during crises. How to donate safely.',
    bodyAr: `## استغلال الكرم

الفلسطينيون من أكثر الشعوب تبرعًا، خصوصًا في رمضان وأوقات الأزمات والحروب. المحتالون يعرفون ذلك، فينشئون حملات مزيفة: صورة طفل مريض (مأخوذة من الإنترنت)، قصة مؤثرة، ورقم محفظة إلكترونية «للتبرع العاجل». المال يذهب لجيب المحتال، والحالة — إن وُجدت أصلًا — لا تصلها أغورة.

## أشكال شائعة

- **حالات مرضية مزيفة:** صور حقيقية لمرضى تُسرق من صفحات أخرى وتُنشر مع رقم حساب مختلف. أحيانًا تكون الحالة حقيقية لكن المُجمِّع محتال لا صلة له بها.
- **إغاثة طوارئ وهمية:** ساعات بعد أي حدث كبير تظهر صفحات «إغاثة عاجلة» جديدة كليًا تجمع عبر أرقام شخصية.
- **كفالات أيتام وهمية:** «اكفل يتيمًا بـ100 شيكل شهريًا» عبر جمعية لا وجود لها.
- **انتحال جمعيات حقيقية:** صفحة تقلّد اسم وشعار جمعية معروفة مع تغيير رقم الحساب.

## كيف تتبرع بأمان؟

- **تبرع عبر الجمعيات المرخصة** المسجلة لدى وزارة الداخلية/التنمية الاجتماعية، وعبر قنواتها الرسمية فقط: موقعها المعتمد، حسابها البنكي المعلن، أو مقرها مباشرة.
- **لا تحوّل لحساب شخصي:** الجمعية الحقيقية لها حساب بنكي باسمها، لا باسم «أبو فلان».
- **تحقق من الصفحة:** تاريخ الإنشاء، تغييرات الاسم، هل رقم الهاتف المعلن يطابق رقم الجمعية على موقعها الرسمي؟
- **ابحث عن الصورة عكسيًا:** إن كانت صورة الحالة منشورة منذ سنوات ببلد آخر فالحملة مزيفة.
- **اسأل الجمعية مباشرة:** اتصل على رقمها الرسمي واسأل: هل هذه الحملة تابعة لكم؟

## الخلاصة

طيبة قلبك أثمن من أن تذهب لمحتال. دقيقتان من التحقق تضمنان وصول تبرعك لمن يستحقه فعلًا. وإذا صادفت حملة مشبوهة، أبلغ عنها هنا فورًا.`,
    bodyEn: `## Exploiting generosity

Palestinians are among the most charitable people, especially in Ramadan and during crises and wars. Scammers know this, so they build fake campaigns: a photo of a sick child (taken from the internet), a moving story, and an e-wallet number for "urgent donations". The money goes into the scammer's pocket; the case — if it exists at all — never sees a cent.

## Common variants

- **Fake medical cases:** real patients' photos stolen from other pages and reposted with a different account number. Sometimes the case is real but the collector is a fraudster with no connection to it.
- **Fake emergency relief:** hours after any major event, brand-new "urgent relief" pages appear, collecting through personal wallet numbers.
- **Fake orphan sponsorships:** "Sponsor an orphan for 100 NIS a month" through a charity that does not exist.
- **Impersonating real charities:** a page cloning the name and logo of a known organization with a swapped account number.

## How to donate safely

- **Give through licensed charities** registered with the Ministry of Interior / Social Development, via their official channels only: their verified website, published bank account, or offices.
- **Never transfer to a personal account:** a real charity has a bank account in its own name, not in "Abu Someone's" name.
- **Check the page:** creation date, name changes, and whether the published phone matches the number on the charity's official website.
- **Reverse-search the photo:** if the case's photo was posted years ago in another country, the campaign is fake.
- **Ask the charity directly:** call its official number and ask — is this campaign really yours?

## Bottom line

Your kindness is too precious to end up with a fraudster. Two minutes of verification ensure your donation reaches those who truly deserve it. If you spot a suspicious campaign, report it here immediately.`,
  },
];

// ---------------------------------------------------------------------------
// Quiz questions
// ---------------------------------------------------------------------------

const quizQuestions = [
  {
    questionAr: 'وصلتك رسالة: «مبروك! ربحت 10,000 شيكل من جوال، ادفع 50 شيكل رسوم استلام». ما التصرف الصحيح؟',
    questionEn: 'You receive: "Congratulations! You won 10,000 NIS from Jawwal, pay a 50 NIS collection fee." What is the right move?',
    options: [
      { id: 'a', textAr: 'أدفع 50 شيكل — مبلغ صغير مقابل جائزة كبيرة', textEn: 'Pay the 50 NIS — small amount for a big prize' },
      { id: 'b', textAr: 'أتجاهل الرسالة وأبلغ عن الرقم — الجائزة الحقيقية لا تتطلب دفعًا', textEn: 'Ignore the message and report the number — real prizes never require payment' },
      { id: 'c', textAr: 'أرسل لهم اسمي ورقم هويتي أولًا للتأكد', textEn: 'Send them my name and ID number first to verify' },
      { id: 'd', textAr: 'أشارك الرسالة مع أصدقائي ليجربوا حظهم', textEn: 'Share the message with friends so they can try their luck' },
    ],
    correctOptionId: 'b',
    explanationAr: 'أي «جائزة» تتطلب دفع رسوم هي احتيال مؤكد. الشركات لا تجري سحوبات على أرقام لم تشارك، ولا تطلب مالًا لتسليم جائزة.',
    explanationEn: 'Any "prize" that requires a fee is a guaranteed scam. Companies do not run draws on numbers that never entered, and never charge to deliver a prize.',
  },
  {
    questionAr: 'اتصل بك شخص يدّعي أنه من بنك فلسطين وطلب رمز التحقق الذي وصلك للتو «لإلغاء عملية مشبوهة». ماذا تفعل؟',
    questionEn: 'A caller claiming to be from Bank of Palestine asks for the verification code you just received "to cancel a suspicious transaction". What do you do?',
    options: [
      { id: 'a', textAr: 'أعطيه الرمز فورًا لحماية حسابي', textEn: 'Give him the code immediately to protect my account' },
      { id: 'b', textAr: 'أعطيه الرمز بعد أن يذكر اسمي الكامل', textEn: 'Give the code after he states my full name' },
      { id: 'c', textAr: 'أغلق الخط ولا أشارك الرمز أبدًا، ثم أتصل بالبنك على رقمه الرسمي', textEn: 'Hang up, never share the code, then call the bank on its official number' },
      { id: 'd', textAr: 'أرسل الرمز برسالة نصية بدل قوله هاتفيًا', textEn: 'Text the code instead of saying it on the phone' },
    ],
    correctOptionId: 'c',
    explanationAr: 'رمز التحقق لا يُشارك مع أحد إطلاقًا — ولا حتى موظف البنك. الرمز الذي وصلك غالبًا لتأكيد تحويل بدأه المحتال نفسه من حسابك.',
    explanationEn: 'An OTP is never shared with anyone — not even a bank employee. The code you received was likely generated to confirm a transfer the scammer himself initiated.',
  },
  {
    questionAr: 'أي من هذه الروابط هو الموقع الرسمي لشركة جوال؟',
    questionEn: 'Which of these links is Jawwal\'s official website?',
    options: [
      { id: 'a', textAr: 'jawwal-prizes.win', textEn: 'jawwal-prizes.win' },
      { id: 'b', textAr: 'jawwal.ps', textEn: 'jawwal.ps' },
      { id: 'c', textAr: 'jawwa1.com', textEn: 'jawwa1.com' },
      { id: 'd', textAr: 'bit.ly/jawwal-offer', textEn: 'bit.ly/jawwal-offer' },
    ],
    correctOptionId: 'b',
    explanationAr: 'jawwal.ps هو النطاق الرسمي. jawwal-prizes.win يستخدم امتدادًا مشبوهًا، وjawwa1.com يستبدل حرف l برقم 1 (نطاق متشابه)، والرابط المختصر يخفي وجهته الحقيقية.',
    explanationEn: 'jawwal.ps is the official domain. jawwal-prizes.win uses a scammy TLD, jawwa1.com swaps the letter l for the digit 1 (a lookalike), and the shortened link hides its true destination.',
  },
  {
    questionAr: 'متجر على فيسبوك يبيع آيفون بنصف السعر ويشترط تحويل المبلغ كاملًا مقدمًا ويرفض الدفع عند الاستلام. ما تقييمك؟',
    questionEn: 'A Facebook shop sells iPhones at half price, demands full payment upfront, and refuses cash on delivery. Your assessment?',
    options: [
      { id: 'a', textAr: 'فرصة ممتازة يجب اغتنامها بسرعة قبل نفاد الكمية', textEn: 'A great deal — grab it before stock runs out' },
      { id: 'b', textAr: 'أدفع نصف المبلغ فقط كعربون لتقليل المخاطرة', textEn: 'Pay only half as a deposit to reduce the risk' },
      { id: 'c', textAr: 'مؤشرات احتيال قوية: سعر غير منطقي + دفع مسبق إجباري + رفض الاستلام', textEn: 'Strong scam signals: impossible price + forced prepayment + no cash on delivery' },
      { id: 'd', textAr: 'أطلب رقم هاتف البائع وأثق به إذا رد على اتصالي', textEn: 'Ask for the seller\'s phone and trust him if he answers' },
    ],
    correctOptionId: 'c',
    explanationAr: 'اجتماع السعر الخيالي مع الدفع المسبق الإجباري ورفض الدفع عند الاستلام هو النمط الكلاسيكي للمتاجر الوهمية. لا أحد يبيع بخسارة 50%.',
    explanationEn: 'An impossible price combined with forced prepayment and refusal of cash on delivery is the classic fake-shop pattern. Nobody sells at a 50% loss.',
  },
  {
    questionAr: 'وصلتك رسالة من رقم غريب: «أنا صديقك، أرسلت لك رمزًا بالغلط، أعد إرساله لي بسرعة». ما الذي يحدث غالبًا؟',
    questionEn: 'A strange number messages you: "It\'s your friend — I sent you a code by mistake, forward it back quickly." What is most likely happening?',
    options: [
      { id: 'a', textAr: 'صديقي أخطأ فعلًا وسأرسل له الرمز', textEn: 'My friend really made a mistake; I\'ll send the code' },
      { id: 'b', textAr: 'محتال يحاول سرقة حساب واتساب الخاص بي باستخدام رمز التفعيل', textEn: 'A scammer is trying to hijack my WhatsApp using the activation code' },
      { id: 'c', textAr: 'خطأ تقني من شركة الاتصالات', textEn: 'A technical error from the telecom company' },
      { id: 'd', textAr: 'رسالة ترويجية عادية يمكن تجاهلها دون خطر', textEn: 'A harmless promotional message' },
    ],
    correctOptionId: 'b',
    explanationAr: 'هذه أشهر طريقة لسرقة حسابات واتساب: الرمز الذي وصلك هو رمز تفعيل حسابك أنت. من يحصل عليه يسيطر على حسابك ويخدع كل جهات اتصالك.',
    explanationEn: 'This is the most common WhatsApp takeover trick: the code you received is the activation code for your own account. Whoever gets it controls your WhatsApp and scams all your contacts.',
  },
  {
    questionAr: 'ما العلامة الأقوى على أن رسالة «عرض عمل» هي احتيال؟',
    questionEn: 'What is the strongest sign that a "job offer" message is a scam?',
    options: [
      { id: 'a', textAr: 'الراتب المذكور بالدولار وليس بالشيكل', textEn: 'The salary is quoted in dollars, not shekels' },
      { id: 'b', textAr: 'طلب دفع رسوم تسجيل أو فحص ملف قبل التوظيف', textEn: 'Asking for a registration or file-screening fee before hiring' },
      { id: 'c', textAr: 'أن العمل عن بعد من المنزل', textEn: 'The job is remote / from home' },
      { id: 'd', textAr: 'أن التواصل بدأ عبر رسالة نصية', textEn: 'The contact started via a text message' },
    ],
    correctOptionId: 'b',
    explanationAr: 'القاعدة الذهبية: الشركة الحقيقية تدفع لك ولا تأخذ منك. أي طلب مال مقدم — رسوم تسجيل، تأشيرة، فحص ملف — يعني احتيالًا شبه مؤكد.',
    explanationEn: 'The golden rule: a real employer pays you, never charges you. Any upfront payment request — registration, visa, file screening — means an almost certain scam.',
  },
  {
    questionAr: 'رابط يبدأ بـ https:// ويظهر بجانبه قفل أخضر. ماذا يعني ذلك؟',
    questionEn: 'A link starts with https:// and shows a padlock. What does that mean?',
    options: [
      { id: 'a', textAr: 'الموقع رسمي وموثوق ويمكن إدخال بياناتي بأمان', textEn: 'The site is official and trusted; I can safely enter my data' },
      { id: 'b', textAr: 'الاتصال مشفر فقط — لكن الموقع نفسه قد يكون مزيفًا تمامًا', textEn: 'Only the connection is encrypted — the site itself may still be completely fake' },
      { id: 'c', textAr: 'الموقع فحصته الحكومة وصادقت عليه', textEn: 'The government has inspected and approved the site' },
      { id: 'd', textAr: 'الموقع خالٍ من الفيروسات', textEn: 'The site is free of viruses' },
    ],
    correctOptionId: 'b',
    explanationAr: 'HTTPS يعني أن الاتصال مشفر فحسب. المحتالون يحصلون على شهادات التشفير مجانًا وبسهولة، فالقفل لا يثبت أن الموقع أصلي — افحص اسم النطاق دائمًا.',
    explanationEn: 'HTTPS only means the connection is encrypted. Scammers obtain TLS certificates easily and for free, so the padlock does not prove authenticity — always inspect the domain name.',
  },
  {
    questionAr: 'قبل التبرع لحملة «حالة مرضية عاجلة» منتشرة على فيسبوك، ما أفضل خطوة تحقق؟',
    questionEn: 'Before donating to an "urgent medical case" spreading on Facebook, what is the best verification step?',
    options: [
      { id: 'a', textAr: 'أتبرع فورًا — الحالة عاجلة ولا وقت للتدقيق', textEn: 'Donate immediately — it\'s urgent, no time to verify' },
      { id: 'b', textAr: 'أتبرع إذا كان عدد المشاركات كبيرًا جدًا', textEn: 'Donate if the post has lots of shares' },
      { id: 'c', textAr: 'أتحقق من الحملة عبر جمعية مرخصة أو أتبرع من خلال قنواتها الرسمية فقط', textEn: 'Verify the campaign with a licensed charity, or donate only through official channels' },
      { id: 'd', textAr: 'أحوّل مبلغًا صغيرًا أولًا لأجرب مصداقيتهم', textEn: 'Send a small amount first to test their credibility' },
    ],
    correctOptionId: 'c',
    explanationAr: 'كثرة المشاركات لا تثبت شيئًا — المنشورات المزيفة تنتشر أسرع أحيانًا. تبرع فقط عبر جمعيات مرخصة وقنواتها الرسمية، وتحقق من الصور بالبحث العكسي.',
    explanationEn: 'Share counts prove nothing — fake posts often spread fastest. Donate only via licensed charities and their official channels, and reverse-search the photos.',
  },
];

// ---------------------------------------------------------------------------
// Sample reports (fake but realistic data for the demo)
// ---------------------------------------------------------------------------

interface SeedReport {
  type: ReportType;
  value: string;
  description: string;
  scamCategory: string;
  reporterName?: string;
  status: 'APPROVED' | 'PENDING';
  daysAgo: number;
}

const reports: SeedReport[] = [
  {
    type: 'PHONE', value: '+970599123456', scamCategory: 'PRIZE_SCAM', status: 'APPROVED', daysAgo: 2,
    description: 'اتصل وادعى أنني ربحت 10,000 شيكل من سحب جوال وطلب 100 شيكل رسوم استلام عبر تحويل رصيد.',
    reporterName: 'أحمد من نابلس',
  },
  {
    type: 'PHONE', value: '+970598765432', scamCategory: 'OTP_THEFT', status: 'APPROVED', daysAgo: 4,
    description: 'رسالة تدعي أنها من بنك فلسطين وتطلب رمز التحقق لإلغاء «عملية مشبوهة». الرقم ليس رقم البنك.',
  },
  {
    type: 'PHONE', value: '+970567890123', scamCategory: 'DELIVERY_SCAM', status: 'APPROVED', daysAgo: 6,
    description: 'رسالة عن طرد معلق في الجمارك وطلب دفع 45 شيكل رسوم توصيل عبر رابط دفع مشبوه. لم أطلب أي شحنة.',
    reporterName: 'سارة',
  },
  {
    type: 'PHONE', value: '+970595551234', scamCategory: 'JOB_SCAM', status: 'APPROVED', daysAgo: 9,
    description: 'عرض «عمل من المنزل براتب 300 دولار أسبوعيًا» عبر واتساب، ثم طلب 150 شيكل رسوم تسجيل. Job scam demanding registration fee.',
  },
  {
    type: 'PHONE', value: '+972521112233', scamCategory: 'BANK_PHISHING', status: 'APPROVED', daysAgo: 12,
    description: 'انتحل صفة موظف من PalPay وطلب رقم البطاقة وكلمة السر بحجة تحديث المحفظة.',
    reporterName: 'محمود',
  },
  {
    type: 'URL', value: 'https://jawwal-prize.win/claim', scamCategory: 'PRIZE_SCAM', status: 'APPROVED', daysAgo: 1,
    description: 'صفحة مزيفة بشعار جوال تدعي وجود جائزة وتطلب بيانات البطاقة البنكية لدفع «رسوم التوصيل».',
    reporterName: 'خالد من رام الله',
  },
  {
    type: 'URL', value: 'http://bankofpalestine-verify.top/login', scamCategory: 'BANK_PHISHING', status: 'APPROVED', daysAgo: 3,
    description: 'نسخة مقلدة من صفحة تسجيل دخول بنك فلسطين تسرق اسم المستخدم وكلمة السر. Fake BoP login page.',
  },
  {
    type: 'URL', value: 'https://palpay-bonus.xyz/gift', scamCategory: 'PRIZE_SCAM', status: 'APPROVED', daysAgo: 5,
    description: 'رابط انتشر على واتساب يعد بمكافأة 200 شيكل من PalPay مقابل «تأكيد الحساب» وإدخال رمز التحقق.',
  },
  {
    type: 'URL', value: 'https://ooredoo-gift.icu/win', scamCategory: 'PRIZE_SCAM', status: 'APPROVED', daysAgo: 8,
    description: 'صفحة هدايا مزيفة باسم أوريدو تجمع أرقام الهواتف وبيانات بطاقات الدفع.',
    reporterName: 'لينا',
  },
  {
    type: 'SOCIAL_ACCOUNT', value: '@gaza_cheap_phones', scamCategory: 'FAKE_SHOP', status: 'APPROVED', daysAgo: 7,
    description: 'صفحة إنستغرام تبيع هواتف بنصف السعر، تشترط الدفع المسبق كاملًا ثم تحظر المشتري. عدة ضحايا معروفون.',
    reporterName: 'يوسف',
  },
  {
    type: 'SOCIAL_ACCOUNT', value: '@help_gaza_kids_now', scamCategory: 'CHARITY_SCAM', status: 'APPROVED', daysAgo: 10,
    description: 'حساب يجمع تبرعات لحالات مرضية بصور مسروقة من صفحات أخرى ويحوّل الأموال لمحفظة شخصية.',
  },
  {
    type: 'SOCIAL_ACCOUNT', value: 'facebook.com/quick.crypto.gains.ps', scamCategory: 'CRYPTO_SCAM', status: 'APPROVED', daysAgo: 14,
    description: 'صفحة تروج لتداول عملات رقمية «بأرباح مضمونة 20% أسبوعيًا» وتطلب إيداعًا عبر USDT ثم تختفي.',
    reporterName: 'عمر',
  },
  {
    type: 'SOCIAL_ACCOUNT', value: 'facebook.com/jawwal.prizes2026', scamCategory: 'PRIZE_SCAM', status: 'APPROVED', daysAgo: 1,
    description: 'صفحة تنتحل صفة جوال وتعلن عن «سحب 2026» وتطلب رسوم استلام الجائزة عبر تحويل رصيد. الصفحة ليست موثقة وأنشئت قبل أيام.',
    reporterName: 'رنا من الخليل',
  },
  {
    type: 'SOCIAL_ACCOUNT', value: 'instagram.com/palpay.official.agent', scamCategory: 'BANK_PHISHING', status: 'APPROVED', daysAgo: 3,
    description: 'حساب يدّعي أنه «الوكيل الرسمي» لـ PalPay ويطلب من الضحايا رقم البطاقة ورمز التحقق لتفعيل «مكافأة المحفظة».',
  },
  {
    type: 'SOCIAL_ACCOUNT', value: 't.me/ooredoo_gifts_ps', scamCategory: 'PRIZE_SCAM', status: 'APPROVED', daysAgo: 5,
    description: 'قناة تيليغرام توزع «هدايا أوريدو» وتطلب الضغط على رابط وإدخال بيانات الدفع لاستلام الهدية.',
    reporterName: 'معتصم',
  },
  {
    type: 'SOCIAL_ACCOUNT', value: '@bop_support_2026', scamCategory: 'OTP_THEFT', status: 'APPROVED', daysAgo: 6,
    description: 'حساب ينتحل صفة الدعم الفني لبنك فلسطين ويراسل الزبائن طالبًا رمز التحقق «لتحديث الحساب».',
  },
  // PENDING (not publicly searchable until moderated)
  {
    type: 'PHONE', value: '+970569998877', scamCategory: 'CHARITY_SCAM', status: 'PENDING', daysAgo: 0,
    description: 'رقم يرسل طلبات تبرع لجمعية غير معروفة ويلح على التحويل لمحفظة شخصية.',
  },
  {
    type: 'URL', value: 'https://jawwalpay-update.club/verify', scamCategory: 'BANK_PHISHING', status: 'PENDING', daysAgo: 0,
    description: 'رابط وصلني برسالة SMS يطلب تحديث بيانات محفظة Jawwal Pay خلال 24 ساعة.',
    reporterName: 'مجهول',
  },
];

// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding database...');

  // Idempotent: wipe and re-create
  await prisma.report.deleteMany();
  await prisma.article.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.checkLog.deleteMany();

  for (const a of articles) {
    await prisma.article.create({ data: a });
  }
  console.log(`  ${articles.length} articles`);

  for (const q of quizQuestions) {
    const { options, ...rest } = q;
    await prisma.quizQuestion.create({
      data: { ...rest, optionsJson: JSON.stringify(options) },
    });
  }
  console.log(`  ${quizQuestions.length} quiz questions`);

  for (const r of reports) {
    const { daysAgo, ...rest } = r;
    await prisma.report.create({
      data: {
        ...rest,
        reporterName: rest.reporterName ?? null,
        normalizedValue: normalizeReportValue(r.type, r.value),
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`  ${reports.length} reports (${reports.filter((r) => r.status === 'APPROVED').length} approved, ${reports.filter((r) => r.status === 'PENDING').length} pending)`);

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
