# ClearWorth: Beginner's Pocket Guide 🚀

> **Welcome!** If the codebase looks scary, start here. This guide explains the project in plain English.

---

## 🗺️ What is this project?
Think of **ClearWorth** as a **Video Game for Personal Finance**.
Instead of fighting monsters, you fight **Debt**. Instead of leveling up a character, you level up your **Net Worth**.

We built this app to verify that financial tracking can be fun, private, and smart.

---

## 🗣️ The Language: TypeScript
We use **TypeScript**. It's just JavaScript with **Nametags**.
*   **JavaScript**: `const user = data;` (Who is user? What is data? I don't know!)
*   **TypeScript**: `const user: User = data;` (Ah, `user` has a `name` and `email`!)

If you see a red squiggly line, it means you're trying to put a square peg in a round hole. TypeScript is your friend!

---

## 📍 Project Map
Here is where the treasure is buried:

*   **`src/app`**: The **Routes**. If the URL is `/dashboard`, look for a folder named `dashboard`.
*   **`src/components`**: The **LEGO Bricks**. Small pieces like Buttons, Inputs, and Cards that we use everywhere.
*   **`src/features`**: The **Brain**. This is where the real logic lives.
    *   `src/features/dashboard`: Everything specific to the main screen.
    *   `src/features/mentors`: The AI chat bots logic.
*   **`src/infrastructure`**: The **Plumbing**. Database connections and API calls live here.

---

## 🔑 Key Concepts

### 1. Components (The "Function")
In React, a "Component" is just a function that returns HTML.
```tsx
function Button() {
  return <button>Click me</button>;
}
```

### 2. Hooks (The "Magic")
Hooks are functions that start with `use`. They let you "hook into" React features.
*   `useState`: "Remember this value."
*   `useEffect`: "Do this when the component loads."
*   `useHistory`: "Get me the user's history."

### 3. Props (The "Arguments")
Props are just arguments you pass to a component.
```tsx
<WelcomeMessage name="Ricafort" />
```

---

## 🏃 How to Run this Thing

1.  Open your terminal.
2.  Type: `npm run dev`
3.  Hit Enter.
4.  Open `http://localhost:4000` in your browser.

That's it! You're hacking. Happy coding! 🎉
