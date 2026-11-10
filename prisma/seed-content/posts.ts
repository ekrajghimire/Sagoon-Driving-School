// Learner resource articles (seeded into the Post table; editable in Admin → Content).
// Content is general guidance only — always verify against official NSW sources.
// Supported Markdown: ## / ### headings, - and 1. lists, **bold**, *italic*, [links](https://…), > notes.
export type SeedPost = { slug: string; title: string; excerpt: string; category: string; readMins: number; content: string };

// Official links (copied from src/lib/site.ts → OFFICIAL_LINKS).
const L = {
  licencePathway: "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/learner-drivers",
  getLearner: "https://www.service.nsw.gov.au/transaction/apply-for-a-learner-driver-licence",
  dkt: "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/driver-licences/driver-knowledge-test",
  hpt: "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/driver-licences/hazard-perception-test",
  drivingTest: "https://www.service.nsw.gov.au/transaction/book-a-driving-test",
  roadRules: "https://www.nsw.gov.au/driving-boating-and-transport/roads-safety-and-rules/road-rules",
  logbook: "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/learner-drivers/learner-driver-log-book",
  overseas: "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/visiting-or-moving-to-nsw/moving-to-nsw-from-overseas",
  saferDrivers: "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/learner-drivers/safer-drivers-course",
};

const verify = (links: [string, string][]) =>
  `> **Always check the official rules.** Licensing requirements and road rules change. This guide is general information only — confirm the current requirements with Transport for NSW and Service NSW: ${links
    .map(([label, url]) => `[${label}](${url})`)
    .join(" · ")}.`;

export const POSTS: SeedPost[] = [
  {
    slug: "nsw-licence-pathway-explained",
    title: "The NSW licence pathway explained: L → P1 → P2 → full licence",
    excerpt: "Every step from your learner licence to an unrestricted licence, including minimum times, tests and logbook hours.",
    category: "Licence & tests",
    readMins: 7,
    content: `NSW uses a graduated licensing scheme. You build experience in stages, with restrictions that ease as you go. Here's the whole journey in one place.

## Stage 1: Learner licence (L plates)

**Who:** You must be at least 16 years old.

**How to get it:**
1. Study the *Road User Handbook* (free from Service NSW).
2. Pass the **Driver Knowledge Test (DKT)** — a computer-based multiple-choice test on road rules and safe driving.
3. Pass an eyesight test and pay the licence and test fees.

**While you're on your Ls:**
- Display yellow L plates on the front and back of the car.
- Always drive with a supervisor who holds a full (unrestricted) Australian licence.
- Zero blood alcohol — no alcohol at all.
- Maximum speed limit of 90 km/h.
- No mobile phone use at all while driving, including hands-free and loudspeaker.

**Minimum time and logbook (if you're under 25):**
- Hold your learner licence for a minimum period — currently **at least 10 months** for drivers under 25 (check the current requirement with Service NSW).
- Record at least **120 hours** of supervised driving in your logbook, including **at least 20 hours at night**.
- Pass the **Hazard Perception Test (HPT)** before you can take your driving test.

**If you're 25 or older:** there is no minimum learner period and no logbook requirement, but you still need to pass the HPT and the driving test. We still strongly recommend plenty of practice!

## Stage 2: Provisional P1 licence (red P plates)

**How to get it:** Pass the **driving test** with Service NSW. You must be at least 17.

**Key P1 rules:**
- Display red P plates.
- Hold your P1 for at least **12 months**.
- Maximum speed limit of 90 km/h.
- Zero blood alcohol.
- No mobile phone use at all while driving.
- A lower demerit point limit than full licence holders.
- If you're under 25, passenger restrictions apply late at night.
- Restrictions on driving certain high-performance vehicles.

## Stage 3: Provisional P2 licence (green P plates)

**How to get it:** After at least 12 months on your P1 (and meeting the conditions — for example, not having your licence suspended), you can move to your P2.

**Key P2 rules:**
- Display green P plates.
- Hold your P2 for at least **24 months**.
- Maximum speed limit of 100 km/h.
- Zero blood alcohol.
- Mobile phone and other restrictions still apply — check the current P2 rules.

## Stage 4: Full (unrestricted) licence

After at least 24 months on your P2 and meeting the eligibility conditions, you can apply for your full licence. Under the current rules no extra driving test is required at this stage — check with Service NSW when you're eligible.

## How long does it all take?

For a driver under 25, the minimum is roughly **10 months (L) + 12 months (P1) + 24 months (P2)** — just under four years from L plates to a full licence. Suspensions or offences can extend this.

## How lessons fit in

Professional lessons with a licensed driving instructor help at every stage — and in NSW they also give you **bonus logbook hours** (see our [logbook guide](/resources/logbook-hours-explained)).

${verify([["Learner drivers", L.licencePathway], ["Apply for a learner licence", L.getLearner], ["Driver Knowledge Test", L.dkt], ["Hazard Perception Test", L.hpt], ["Book a driving test", L.drivingTest]])}`,
  },
  {
    slug: "logbook-hours-explained",
    title: "Logbook hours explained: 120 hours, night driving and the 3-for-1 bonus",
    excerpt: "How many hours you need, how night hours work, and how professional lessons can boost your logbook.",
    category: "Licence & tests",
    readMins: 6,
    content: `If you're under 25, your logbook is your ticket to the driving test. Here's how it works and how to get through it smartly.

## How many hours do I need?

Learner drivers under 25 must record at least:
- **120 hours** of supervised driving in total, including
- **20 hours of night driving** (between sunset and sunrise).

If you're 25 or older, you don't need to complete a logbook — but practice is still the best way to pass.

## The 3-for-1 bonus for professional lessons

Each **1 hour** of structured driving lessons with a licensed driving instructor can be recorded as **3 hours** in your logbook.

- This bonus applies to a maximum of **10 hours of lessons**, which counts as **30 logbook hours**.
- Lessons must be with a driving instructor who holds a current NSW driving instructor licence, and must be recorded correctly by the instructor.
- Bonus hours count towards your 120 hours, but they don't replace the **20 night hours** — you still need to complete those (check how night lessons are credited with Service NSW).

**Tip:** A 10-lesson package of one-hour lessons is the most efficient way to use the full bonus.

## The Safer Drivers Course

The **Safer Drivers Course** is a course for learners under 25 who have already completed at least 50 hours of supervised driving. Completing it can credit **20 hours** to your logbook.

There are rules about how the Safer Drivers Course and professional lesson bonuses combine, so check the current limits with Service NSW before you plan around them.

## How to record your hours

You can use the **digital logbook in the Service NSW app** or the printed paper logbook. For each drive, record:
- the date, start and finish times
- whether it was day or night
- the road and weather conditions
- your supervisor's details and signature (or digital confirmation)

**Be honest and accurate** — logbooks are checked, and falsifying entries is an offence.

## Making your 120 hours count

1. **Drive in different conditions** — rain, peak hour, highways, quiet suburbs, car parks.
2. **Mix up your routes** so you don't just get good at one drive.
3. **Plan night drives early** — 20 hours takes longer than you'd think, especially in summer when it gets dark late.
4. **Use lessons to learn new skills**, then practise them with your supervisor.
5. **Ask your instructor what to practise** between lessons.

${verify([["Learner driver log book", L.logbook], ["Safer Drivers Course", L.saferDrivers], ["Learner drivers", L.licencePathway]])}`,
  },
  {
    slug: "what-to-bring-to-your-first-lesson",
    title: "What to bring to your first driving lesson (and what to expect)",
    excerpt: "A simple checklist so you arrive calm and ready — plus exactly what happens in lesson one.",
    category: "Getting started",
    readMins: 4,
    content: `Your first lesson is about getting comfortable, not being perfect. Here's how to prepare.

## Bring these

- **Your learner licence** (or your overseas licence). By law, we can't start the lesson without it.
- **Glasses or contact lenses** if you need them for driving.
- **Comfortable, flat shoes** — avoid thongs, heels, slides or heavy boots. You need to feel the pedals.
- **A bottle of water**.
- Your **logbook** or the Service NSW app, so your lesson hours can be recorded.

## Wear

- Comfortable clothes you can move freely in.
- Sunglasses on bright days (non-polarised are best for seeing screens and some displays).

## What happens in your first lesson

1. **A friendly chat** about your experience, goals and any worries.
2. **The cockpit drill** — adjusting your seat, mirrors, steering wheel and seatbelt.
3. **Getting to know the controls** — accelerator, brake, indicators, wipers, lights and the automatic gear selector.
4. **Moving off and stopping** in a quiet street or car park.
5. **Steering and turning** at a gentle pace.
6. **A quick debrief** — what went well and what we'll cover next time.

Remember, our car has **dual controls**, so your instructor can brake at any time. You're in safe hands.

## Feeling nervous?

That's completely normal — most of our students feel the same. Tell us when you book and we'll plan an extra-gentle start. Read our guide to [handling nerves](/resources/handling-driving-nerves).

${verify([["Learner drivers", L.licencePathway], ["Learner driver log book", L.logbook]])}`,
  },
  {
    slug: "how-to-prepare-for-driving-lessons",
    title: "How to prepare for driving lessons so every minute counts",
    excerpt: "Small habits before and between lessons that help you learn faster and save money.",
    category: "Getting started",
    readMins: 4,
    content: `Lessons are an investment. A little preparation means you spend lesson time learning, not warming up.

## The night before

- **Get a good sleep.** Tiredness affects concentration and reaction time.
- **Re-read your notes** from your last lesson, or check your skills progress in your account.
- **Think about one thing** you'd like to improve.

## On the day

- **Eat something light** beforehand — driving while hungry makes it hard to concentrate.
- **Avoid caffeine overload** if it makes you jittery.
- **Be ready a few minutes early** at your pickup address with your licence.
- **No alcohol** — learners must have zero blood alcohol. Also be careful with medication that can cause drowsiness.

## Between lessons

- **Practise with a supervisor** what you learned. Even 20–30 minutes a few times a week makes a big difference.
- **Revise road rules** using the *Road User Handbook*.
- **Be a "commentary passenger"** — when someone else drives, talk through what you'd do: hazards, mirror checks, gaps.

## Ask questions

There's no such thing as a silly question. If something didn't make sense, ask at the start of your next lesson — we'll explain it a different way.

## Book regularly

Learners who book lessons **weekly or fortnightly** tend to progress faster than those with long gaps, because skills don't fade between lessons.

${verify([["Learner drivers", L.licencePathway], ["NSW road rules", L.roadRules]])}`,
  },
  {
    slug: "beginner-driving-tips",
    title: "10 driving tips every beginner should know",
    excerpt: "Simple habits that make you smoother, safer and more confident from day one.",
    category: "Getting started",
    readMins: 5,
    content: `Great drivers aren't born — they build good habits early. Start with these.

## 1. Set up before you start
Seat, mirrors, steering wheel and seatbelt — every single time. A good driving position makes everything easier.

## 2. Look far ahead
Beginners tend to stare just past the bonnet. Look well up the road — where you look is where you'll steer, and you'll spot hazards earlier.

## 3. Be gentle with the pedals
In an automatic, smooth driving comes from **gentle pressure** on the accelerator and brake. Squeeze, don't stab.

## 4. Mirrors, signal, head check
Before changing lanes, pulling out or turning: check your mirrors, signal for long enough, and do a head check over your shoulder for the blind spot.

## 5. Keep a safe gap
Use the **3-second rule** behind the car in front — more in rain or at night.

## 6. Hands on the wheel
Hold the wheel with both hands in a comfortable "quarter to three" or "ten to two" position, and use a push-pull technique for most turns.

## 7. Know your speed
Glance at the speedometer regularly and always know the current speed limit. If you're not sure, look for signs — and remember school zones.

## 8. Plan your turns early
Get into the correct lane and slow down **before** the intersection, not in it.

## 9. Stay calm when you make a mistake
Everyone stalls their thinking sometimes. Breathe, focus on the road ahead and keep going safely. Talk about it after the lesson.

## 10. Practise in all conditions
Day and night, rain and sun, quiet streets and busy roads. Variety builds real confidence.

${verify([["NSW road rules", L.roadRules], ["Learner drivers", L.licencePathway]])}`,
  },
  {
    slug: "driving-lesson-dos-and-donts",
    title: "Do's and don'ts: before your lesson, during your lesson and on test day",
    excerpt: "A practical checklist for learners — what to do, and what to avoid, at every stage.",
    category: "Getting started",
    readMins: 5,
    content: `Use this checklist to make every lesson — and your test — go smoothly.

## Before the lesson

**Do:**
- Bring your licence and wear flat shoes.
- Get a good night's sleep and eat beforehand.
- Tell your instructor about any medical conditions or worries.
- Review what you covered last time.

**Don't:**
- Drink any alcohol — learners must have zero blood alcohol.
- Take medication that warns against driving.
- Wear thongs, heels or bulky boots.
- Cancel at the last minute if you can avoid it (check our [cancellation policy](/cancellation-policy)).

## During the lesson

**Do:**
- Ask questions whenever something isn't clear.
- Tell your instructor if you feel tired, stressed or uncomfortable.
- Use your mirrors and head checks — even when it feels like overkill.
- Focus on one skill at a time.

**Don't:**
- Use your phone — learners and P1 drivers can't use a mobile phone at all while driving.
- Rush. Slow and correct beats fast and sloppy.
- Panic after a mistake — breathe and carry on safely.
- Compare yourself to friends. Everyone learns at their own pace.

## On test day

**Do:**
- Arrive early with your learner licence and any documents Service NSW asks for (check your booking confirmation).
- Have a warm-up lesson beforehand to settle your nerves.
- Listen carefully to the testing officer's instructions — ask them to repeat if needed.
- Exaggerate your observation slightly so the tester can see your head checks.
- Keep driving safely even if you think you've made a mistake.

**Don't:**
- Stay up late the night before.
- Drive over the speed limit — even by a little.
- Roll through stop signs. Stop completely behind the line.
- Assume you've failed and give up. Many small errors don't mean an automatic fail.

${verify([["Book a driving test", L.drivingTest], ["NSW road rules", L.roadRules]])}`,
  },
  {
    slug: "driver-knowledge-test-tips",
    title: "How to pass the Driver Knowledge Test (DKT) first time",
    excerpt: "What the DKT covers, how it works and the study method that actually works.",
    category: "Licence & tests",
    readMins: 5,
    content: `The **Driver Knowledge Test (DKT)** is the first step to getting your learner licence in NSW. It's a computer-based, multiple-choice test about road rules and safe driving.

## What's in the test?

The DKT questions are based on the official **Road User Handbook**. The test is split into sections covering general knowledge and road safety, and you need a very high score in the road safety section to pass. Check the current number of questions and pass marks with Service NSW before your test.

Topics include:
- Speed limits (including school zones and learner limits)
- Give way rules at intersections and roundabouts
- Traffic signs, signals and road markings
- Alcohol, drugs and fatigue
- Seatbelts and child restraints
- Licence conditions and demerit points
- Sharing the road with pedestrians, cyclists, motorcyclists and heavy vehicles

## How to study

1. **Read the Road User Handbook properly** — not just skimming. It's the source of every question.
2. **Use the official practice test.** The NSW Government provides practice questions that mirror the real test.
3. **Focus on your weak areas.** Keep track of questions you get wrong and re-read those sections.
4. **Learn the numbers** — speed limits, distances (like parking distances from intersections), alcohol limits and demerit points.
5. **Practise until you consistently pass** with a margin to spare.

## On the day

- Book your test with Service NSW (in some cases it may be available online — check eligibility).
- Bring your proof of identity documents. Check exactly what's needed before you go.
- Read every question **and every answer** carefully. Watch for words like "not", "always" and "never".
- Don't rush — there's usually plenty of time.

## After you pass

Congratulations — you can get your learner licence! Book your [first lesson](/book) and read [what to bring](/resources/what-to-bring-to-your-first-lesson).

${verify([["Driver Knowledge Test", L.dkt], ["Apply for a learner licence", L.getLearner]])}`,
  },
  {
    slug: "hazard-perception-test-tips",
    title: "Hazard Perception Test (HPT) tips: how to spot danger early",
    excerpt: "What the HPT measures, why driving experience matters, and how to practise.",
    category: "Licence & tests",
    readMins: 5,
    content: `In NSW, learners need to pass the **Hazard Perception Test (HPT)** before they can take the driving test. It checks how well you recognise and respond to potentially dangerous situations.

## How the HPT works

The HPT is a computer-based test using video clips of real traffic. You respond by touching the screen when you think it's safe (or not safe) to do something — such as slow down, turn, overtake or move off. It measures judgement and timing, not just knowledge.

Check the current eligibility rules (including any minimum time on your learner licence) and how to book with Service NSW.

## What counts as a hazard?

Anything that could cause you to change speed or direction:
- A car waiting to pull out from a driveway or side street
- Pedestrians near the kerb, especially children
- A cyclist ahead on a narrow road
- Brake lights several cars ahead
- A bus pulling out from a stop
- A car door opening in a row of parked cars

## How to prepare

1. **Get real driving experience.** The HPT is easier once you have many hours behind the wheel — you'll recognise situations naturally.
2. **Do the official practice test** from the NSW Government.
3. **Commentary driving:** as a passenger, say out loud every hazard you spot and what you'd do.
4. **Scan constantly** — far ahead, near, mirrors, sides. Good drivers move their eyes every couple of seconds.
5. **Know safe gaps.** Practise judging gaps for turning across traffic with your supervisor.

## Common mistakes

- Responding too early or too late — wait until the action would actually be safe.
- Not considering hidden hazards (behind parked vans, around corners).
- Focusing only on the car directly in front.

## Lessons help

Our lessons include hazard perception coaching: we'll point out hazards, ask you what you see, and build the scanning habits the HPT — and real driving — rewards.

${verify([["Hazard Perception Test", L.hpt], ["Learner drivers", L.licencePathway]])}`,
  },
  {
    slug: "common-driving-test-mistakes",
    title: "The most common driving test mistakes (and how to avoid them)",
    excerpt: "The errors that trip up learners most often in the NSW driving test — and simple fixes.",
    category: "Licence & tests",
    readMins: 6,
    content: `Most failed tests come down to a handful of habits. The good news: they're all fixable with practice.

## 1. Not enough observation
**The mistake:** Missing mirror checks or head checks before changing lanes, pulling out from the kerb or turning.
**The fix:** Build the routine: *mirrors → signal → head check → move*. Make your head checks clear enough that the tester can see them.

## 2. Rolling stops
**The mistake:** Slowing at a stop sign but not coming to a complete stop.
**The fix:** Stop completely behind the stop line, count "one, two", look both ways, then go when safe.

## 3. Speeding (even slightly)
**The mistake:** Creeping over the limit, or missing a school zone or speed change.
**The fix:** Check your speedometer often, watch for signs, and know when school zones operate.

## 4. Failing to give way
**The mistake:** Misjudging who has right of way at intersections, roundabouts or when turning across pedestrians.
**The fix:** Revise give way rules and practise judging safe gaps. When in doubt, wait.

## 5. Poor lane position and wide turns
**The mistake:** Drifting across lanes, cutting corners or swinging wide.
**The fix:** Look where you want to go, and turn into the corresponding lane.

## 6. Hesitation
**The mistake:** Waiting too long when it's clearly safe, which can hold up traffic.
**The fix:** Practise judging gaps in busy traffic so you can move off confidently.

## 7. Indicator errors
**The mistake:** Forgetting to signal, signalling too late, or leaving the indicator on.
**The fix:** Signal for long enough to warn others (at least 5 seconds when pulling out from the kerb), and check it has cancelled.

## 8. Manoeuvre errors
**The mistake:** Hitting the kerb, not checking for traffic or taking too many corrections during parking or turning manoeuvres.
**The fix:** Practise reverse parallel parking, kerbside stops and 3-point turns until they're routine. See our [parking guide](/resources/parking-guide-reverse-parallel-kerbside).

## 9. Nerves taking over
**The mistake:** Rushing or freezing because of test anxiety.
**The fix:** Take a warm-up lesson on the day, breathe slowly, and remember a small mistake doesn't automatically mean a fail.

## Want a test-style drive?

Our lessons include **mock tests** on local roads, marked the way a testing officer would assess you, so you know exactly where you stand.

${verify([["Book a driving test", L.drivingTest], ["NSW road rules", L.roadRules]])}`,
  },
  {
    slug: "roundabouts-guide",
    title: "Roundabouts made easy: a step-by-step guide for NSW learners",
    excerpt: "Give way, lane choice and signalling at single and multi-lane roundabouts.",
    category: "Skills guides",
    readMins: 5,
    content: `Roundabouts worry a lot of learners, but once you know the rules they become one of the easiest intersections to handle.

## The golden rule

When entering a roundabout, you must **give way to all vehicles already in the roundabout**. In practice, that means watching traffic coming from your **right**.

## Choosing your lane and signal

- Turning **left** (first exit): use the left lane and signal left.
- Going **straight**: use either lane unless markings say otherwise. No signal needed on approach.
- Turning **right** or making a **U-turn**: use the right lane and signal right.

## Step by step

1. **Approach slowly** and look for signs or road markings showing which lane to use.
2. **Choose your lane early** and signal as above.
3. **Give way** to vehicles already on the roundabout. Look right, and also check for pedestrians and cyclists.
4. **Enter when there's a safe gap** — don't stop in the roundabout unless you have to.
5. **Stay in your lane** around the roundabout.
6. **Signal left before you exit** (where practical), check your mirror and exit into the corresponding lane.

## Multi-lane roundabouts

- Pick your lane before you enter and **don't change lanes** inside the roundabout.
- Watch for vehicles in the lane beside you, especially trucks and buses that may need extra space.
- When exiting from the right lane, check your left mirror and blind spot for vehicles in the left lane.

## Common mistakes

- Forgetting to signal left on exit.
- Stopping when there's a safe gap (hesitation).
- Entering without checking for cyclists.
- Cutting across lanes.

## Practise

Practise on quiet single-lane roundabouts first, then build up to busier multi-lane ones. In Rockdale and the St George area we have plenty of both — we'll take you through them step by step.

${verify([["NSW road rules", L.roadRules]])}`,
  },
  {
    slug: "parking-guide-reverse-parallel-kerbside",
    title: "Parking guide: reverse parallel parking, kerbside stops and 90° parking",
    excerpt: "Step-by-step methods for the parking manoeuvres learners practise most.",
    category: "Skills guides",
    readMins: 6,
    content: `Parking is mostly about **slow speed, good observation and reference points**. Here are the methods we teach.

## Kerbside stop (pulling over)

1. Check mirrors and blind spot, then **signal left**.
2. Slow down gradually and steer gently towards the kerb.
3. Stop **parallel and close to the kerb** (within about 30–50 cm is a good target) without touching it.
4. Select **Park**, apply the park brake and cancel your indicator.

**Pulling back out:** Check mirrors, **signal right for at least 5 seconds**, do a **head check over your right shoulder**, and move off only when there's a safe gap.

## Reverse parallel parking

Choose a space at least about one and a half car lengths long.

1. **Signal left** and stop alongside the car in front of the space — about 1 metre away, with your rear bumper roughly level with theirs.
2. Select reverse. Check all around, including your blind spots.
3. **Reverse slowly**. When the rear of your car is level with the other car's rear bumper, steer **left** (about one full turn).
4. When your car is at about **45 degrees** to the kerb (or your left mirror shows the kerb in a good position), **straighten the wheels**.
5. When your front is clear of the car ahead, steer **right** to bring the car parallel with the kerb.
6. Straighten up and move forward to centre in the space. Aim to finish **close and parallel** to the kerb.

**Key tips:** Keep the speed at a walking pace or slower, and look around constantly — the test checks observation as much as accuracy.

## 90° (angle) parking — forward

1. Signal and position yourself a little away from the bays to give room to turn.
2. When your front wheels reach the line of the bay **before** your chosen space (or your mirror aligns with the near line), steer firmly into the space.
3. Straighten as the car lines up between the lines, and stop before the kerb or wheel stop.

## 90° reverse parking

Reversing into a bay gives better visibility when you leave.
1. Drive past the bay by about one to one and a half bays.
2. Select reverse, check all around, and steer towards the bay as you reverse slowly.
3. Use both mirrors to keep evenly between the lines, then straighten up.

## Practice makes it easy

Find an empty car park (early mornings are great) and practise with cones or bins. In lessons we'll give you reference points specific to our car.

${verify([["NSW road rules", L.roadRules], ["Book a driving test", L.drivingTest]])}`,
  },
  {
    slug: "handling-driving-nerves",
    title: "Nervous about driving? 9 ways to feel calmer behind the wheel",
    excerpt: "Practical, proven ways to manage driving anxiety — from your first lesson to test day.",
    category: "Confidence",
    readMins: 5,
    content: `If driving makes you anxious, you're not alone — it's one of the most common things we hear from new students. Nerves are normal and they **do** get easier with the right approach.

## 1. Tell your instructor
We can't help with what we don't know. Let us know you're nervous and we'll adjust the pace, the route and how we explain things.

## 2. Start somewhere quiet
Empty streets and car parks let you learn the controls without pressure. We only move to busier roads when you're ready.

## 3. Remember the dual controls
Our car has an instructor brake. You're never alone, and you're never out of control.

## 4. Breathe slowly
Try **box breathing**: breathe in for 4, hold for 4, out for 4, hold for 4. Do it before you start and at red lights.

## 5. Focus on one thing at a time
Trying to remember everything at once is overwhelming. Each lesson has one main focus.

## 6. Shrink "what ifs"
Instead of imagining everything that could go wrong, ask: *"What would I do if…?"* Planning responses turns worry into skills.

## 7. Small, regular practice
Short, frequent drives beat occasional long ones. Confidence grows from repetition.

## 8. Celebrate progress
Notice what you can do now that you couldn't last week. Your skills tracker in your account shows your progress too.

## 9. Look after yourself
Sleep, food and water make a real difference. Avoid too much caffeine before a lesson if it makes you jittery.

## When it's more than nerves

If anxiety is affecting your daily life or you've had a frightening experience on the road, talking to your GP can help. Many people find that combining lessons with support from a health professional works really well.

## We're here to help

Our *Confidence & senior refresher* lessons are designed for nervous, returning and anxious drivers. [Book a calm lesson](/book) whenever you're ready.

${verify([["Learner drivers", L.licencePathway]])}`,
  },
  {
    slug: "nsw-road-rules-refresher",
    title: "NSW road rules refresher: school zones, give way, phones and P-plate rules",
    excerpt: "A quick reminder of the rules learners and new drivers get asked about most.",
    category: "Road rules",
    readMins: 6,
    content: `Rules you learned for your DKT are easy to forget. Here's a refresher on the ones that matter most day to day.

## School zones

- The speed limit in school zones is **40 km/h** during school zone times on school days.
- Standard times are generally **8:00am–9:30am and 2:30pm–4:00pm**, but some schools have different times — always read the signs.
- Look out for flashing lights, children crossing and buses.

## Give way basics

- At a **give way sign** or line, slow down and give way to vehicles on the road you're entering.
- At a **stop sign**, stop completely behind the line, then give way.
- When **turning**, give way to pedestrians crossing the road you're turning into.
- At an intersection with **no signs or lights** (T-intersections aside), give way to vehicles on your right.
- At a **T-intersection**, vehicles on the road that ends give way to vehicles on the continuing road.
- At **roundabouts**, give way to vehicles already in the roundabout. See our [roundabouts guide](/resources/roundabouts-guide).

## Mobile phones

- **Learner and P1 drivers must not use a mobile phone at all** while driving, including hands-free, loudspeaker and navigation.
- Restrictions also apply to P2 and full licence holders — for example, you can't hold your phone while driving. Check the exact rules for your licence type.
- NSW uses mobile phone detection cameras, and penalties include fines and demerit points.

## Speed limits for learners and provisional drivers

- **Learners:** maximum 90 km/h.
- **P1:** maximum 90 km/h.
- **P2:** maximum 100 km/h.
- Always obey the posted limit if it's lower. In built-up areas the default limit is **50 km/h** unless signs say otherwise.

## Alcohol

Learner and provisional drivers must have a **zero** blood alcohol concentration. That means no alcohol at all before driving.

## P-plate rules at a glance

- Display your plates clearly on the front and back.
- Lower demerit point limits than full licence holders.
- Passenger restrictions may apply for P1 drivers under 25 late at night.
- Some high-performance vehicles are prohibited.

## Other rules learners often forget

- **Keep left** unless overtaking on multi-lane roads with a speed limit over 80 km/h (or where signs say).
- **Slow down to 40 km/h** when passing stationary emergency vehicles with flashing lights (check current rules for details).
- **Indicate** for long enough to give warning — at least 5 seconds when pulling out from the kerb.
- **Headlights** must be on from sunset to sunrise and in poor visibility.

${verify([["NSW road rules", L.roadRules], ["Learner drivers", L.licencePathway]])}`,
  },
  {
    slug: "converting-overseas-licence-nsw",
    title: "Converting an overseas licence in NSW: what you need to know",
    excerpt: "Can you drive on your overseas licence, when you need a NSW licence, and how refresher lessons help.",
    category: "Licence & tests",
    readMins: 5,
    content: `Moved to Sydney? Here's an overview of driving on an overseas licence and getting your NSW licence.

## Can I drive on my overseas licence?

Generally, **visitors** can drive in NSW on a current overseas licence, as long as it's in English or accompanied by an English translation or International Driving Permit, and you only drive the types of vehicles your licence allows.

If you become a **permanent resident**, you'll usually need to get a NSW licence within a set period (currently 3 months for most new residents — check your situation with Service NSW).

## Do I need to sit tests?

It depends on the country that issued your licence:
- Licence holders from some **recognised countries** may be able to transfer to a NSW licence without a driving test.
- Others may need to pass the **Driver Knowledge Test**, a **driving test**, and possibly other assessments.

Your age, how long you've held your licence and your visa status can also matter. Always confirm what applies to you with Service NSW before booking anything.

## Why refresher lessons help

Even very experienced drivers can be caught out by NSW differences:
- **Driving on the left** and give way rules at intersections and roundabouts
- **Strict speed enforcement**, school zones and speed cameras
- **Mobile phone rules** and detection cameras
- What NSW **testing officers** look for: clear observation, signalling, lane discipline and complete stops

Our **Overseas licence refresher** lesson covers NSW rules, local habits and a test-style drive on local roads, with honest feedback on anything you need to fix. Many experienced drivers need only 1–3 lessons.

## Next steps

1. Check your eligibility and requirements on the official website.
2. Study the *Road User Handbook* if you need to sit the DKT.
3. Book a [refresher lesson](/book?lesson=overseas-refresher) before your test.

${verify([["Moving to NSW from overseas", L.overseas], ["Driver Knowledge Test", L.dkt], ["Book a driving test", L.drivingTest]])}`,
  },
];
