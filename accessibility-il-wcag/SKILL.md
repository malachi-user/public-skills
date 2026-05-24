---
name: accessibility-il-wcag
description: Use when the user asks to make a site accessible, add an accessibility widget, comply with Israeli Standard 5568, or implement WCAG 2.1 AA. Triggers on "נגישות", "תקן 5568", "accessibility", "WCAG", "הצהרת נגישות", "כפתור נגישות".
---

# הנגשת אתר — תקן ישראלי 5568 + WCAG 2.1 AA

הטמעת נגישות מלאה: מבנה סמנטי, ניווט מקלדת, ARIA, ווידג'ט נגישות צף, ועמוד הצהרת נגישות.

## When to use
- בקשה להנגיש אתר / להוסיף כפתור נגישות / לעמוד בתקן 5568 או WCAG 2.1 AA.
- ביקורת/תיקון נגישות על אתר קיים.

## Workflow

עבור על הקבצים בסדר: design tokens (`src/styles.css`) → root layout → routes → components אינטראקטיביים. בצע את כל השלבים, לא רק חלקם.

### 1. מבנה סמנטי וקוד בסיסי
- החלף `<div>` wrappers ב-`<header> <nav> <main> <section> <article> <aside> <footer>` לפי תפקיד.
- **`<main>` יחיד לכל עמוד** — במסגרת TanStack Start ב-`__root.tsx` סביב `<Outlet />`.
- היררכיית כותרות: H1 יחיד לעמוד, ללא דילוג רמות.
- ניגודיות: בדוק שכל token ב-`src/styles.css` עומד ב-4.5:1 לטקסט רגיל, 3:1 לטקסט גדול (18pt+ / 14pt bold). השתמש ב-`text-foreground` ולא ב-`text-gray-*` שרירותי.
- ודא `<html lang="he" dir="rtl">` (או en/ltr לפי האתר).

### 2. ניווט מקלדת ופוקוס
- כל אינטראקטיבי מגיע ב-Tab בסדר הגיוני (אל תשתמש ב-`tabIndex > 0`).
- הוסף ב-`styles.css`:
  ```css
  *:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  ```
- הוסף Skip link ב-root layout, מעל ה-`<Outlet />`:
  ```tsx
  <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-50 focus:bg-background focus:text-foreground focus:px-4 focus:py-2 focus:rounded">דלג לתוכן העיקרי</a>
  ```
  ושים `id="main-content"` ב-`<main>`.
- העדף primitives של shadcn/Radix לדיאלוגים/תפריטים — focus trap + Esc כבר מובנים.

### 3. ARIA וקוראי מסך
- כל `<img>` עם `alt`. דקורטיבי → `alt=""`.
- כפתורי אייקון בלבד → `aria-label="…"` משמעותי.
- מודלים/תפריטים: `aria-expanded`, `aria-haspopup`, `aria-modal`, `role="dialog"`, מעדכן דינמית.

### 4. טפסים
- `<Label htmlFor=…>` לכל input. אם אין label גלוי → `aria-label`.
- שגיאות: `aria-describedby` המקושר ל-id של הודעת השגיאה, ניסוח פשוט.

### 5. ווידג'ט נגישות (Accessibility Widget)

צור `src/components/AccessibilityWidget.tsx` — כפתור צף + פאנל. דרישות:

- כפתור צף קבוע (bottom-right ברירת מחדל), `aria-label="תפריט נגישות"`, גודל min 44x44.
- בלחיצה: `<Dialog>` של shadcn (נותן role="dialog", focus trap, Esc).
- שמירת state ב-`localStorage` תחת מפתח `a11y-prefs`, החלת ההגדרות ב-mount דרך `useEffect` שמוסיף className/data-attributes ל-`document.documentElement`.
- כל ההגדרות **באמצעות class על `<html>`** + CSS גלובלי ב-`styles.css`, לא inline styles.

**הגדרות חובה** (כולן הפיכות):
1. גודל טקסט — 3 רמות (`a11y-text-100/125/150`) שמכפילות `font-size` של `:root`.
2. ניגודיות גבוהה — `a11y-high-contrast`: רקע שחור, טקסט לבן, קישורים צהובים, גבולות לבנים.
3. הדגשת קישורים — `a11y-emphasize-links`: `a { text-decoration: underline !important; color: var(--link-emphasis) !important; }`.
4. גופן קריא — `a11y-readable-font`: כפיית `font-family: Arial, Helvetica, sans-serif` על הכל.
5. עצירת אנימציות — `a11y-no-motion`: `*, *::before, *::after { animation: none !important; transition: none !important; } video, [autoplay] { /* pause via JS */ }`. בנוסף ב-mount, אם הדגל פעיל, `document.querySelectorAll('video,audio').forEach(v => v.pause())`.
6. גווני אפור — `a11y-grayscale`: `html.a11y-grayscale { filter: grayscale(100%); }`.
7. מרווחים — `a11y-spacing`: `line-height: 1.8; letter-spacing: 0.05em; word-spacing: 0.1em`.
8. בהיר/כהה — toggle של class `dark` ב-`<html>`.
9. **איפוס הגדרות** — מנקה localStorage ומסיר את כל ה-classes.
10. **הסתרת כפתור הנגישות** — דגל נפרד; כשפעיל, הכפתור הצף לא נטען. החזרה אפשרית רק דרך URL hash `#a11y` שמכריח הצגה.
11. קישור לעמוד "הצהרת נגישות" בתחתית הפאנל.

מאונט פעם אחת ב-`__root.tsx` בתוך ה-`RootComponent`.

### 6. עמוד הצהרת נגישות

צור `src/routes/accessibility.tsx` עם `head()` ייעודי. תוכן:
- H1: "הצהרת נגישות".
- מחויבות העסק להנגשה לכלל האוכלוסייה כולל אנשים עם מוגבלות.
- תקנים: תקן ישראלי 5568 + WCAG 2.1 AA.
- פירוט התאמות שבוצעו בפועל (ניווט מקלדת, סמנטיקה, alt, ניגודיות, ווידג'ט, עצירת אנימציות, וכו').
- מגבלות ידועות + התחייבות לשיפור.
- פרטי קשר רכז נגישות: שם, טלפון, מייל, טופס. **אם הפרטים לא קיימים בקוד/בריף — עצור ובקש מהמשתמש לפני יצירת העמוד**.
- תאריך עדכון אחרון.

### 7. קישורים להצהרה
- קישור קבוע בפוטר.
- קישור בתוך הווידג'ט (סעיף 5, פריט 11).

## Validation

לאחר הטמעה, ודא:
- [ ] Tab דרך כל העמוד — focus ring נראה תמיד.
- [ ] Skip link מופיע בפוקוס ראשון וקופץ ל-`<main>`.
- [ ] קוראי מסך: כפתורי אייקון מקריאים label.
- [ ] כל אפשרות בווידג'ט עובדת, נשמרת ב-reload, ניתנת לאיפוס.
- [ ] עמוד `/accessibility` קיים, מקושר מהפוטר ומהווידג'ט.
- [ ] בדיקת lighthouse accessibility ≥ 95, או הרץ `npx @axe-core/cli` אם זמין.

## Conventions
- שמור CSS של הווידג'ט ב-`styles.css` תחת בלוק `/* Accessibility overrides */` בסוף הקובץ, עם `!important` (נדרש לעקיפת stylesheets קיימים).
- שמות classes על `<html>` תמיד עם prefix `a11y-`.
- מקש localStorage: `a11y-prefs` (JSON אחד עם כל הדגלים).

## Edge cases
- **חסרים פרטי רכז נגישות** → בקש מהמשתמש לפני יצירת `accessibility.tsx`.
- **האתר LTR/אנגלי** → תרגם תוויות לאנגלית והחלף `dir="rtl"` ב-`ltr`.
- **shadcn לא מותקן** → הטמע Dialog ידני עם focus trap (`useEffect` שלוכד Tab) + `role="dialog" aria-modal="true"`.
