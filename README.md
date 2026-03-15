# Gitspect

AI-powered insights from your Git history.

Your repository remembers everything.
**Gitspect tells you why.**

---

## What is Gitspect?

Gitspect analyzes your Git history and turns it into **developer insights**.

Instead of just showing commits, it answers questions like:

* What did I actually work on last month?
* Which files are architectural problems?
* Where did my time go?
* What patterns exist in my coding behavior?

---

## Example

```bash
gitspect analyze
```

Output:

```
Repository Insights

Top edited files:
payment_service.ts
auth_controller.ts

Patterns detected:
- high churn in payment module
- large commits during late hours

Suggestion:
consider modularizing payment_service.ts
```

---

## Features

* Repo analytics
* File churn detection
* Developer behavior insights
* Architecture hotspot detection
* AI-powered weekly summaries
* Git history storytelling

---

## Developer Reflection

```bash
gitspect reflect
```

Output:

```
Last 30 days

You mainly worked on:
- authentication
- payment bug fixes

Potential architectural issue:
payment_service.ts rewritten 6 times
```

---

## Why Gitspect?

Git already tracks everything.

But it doesn’t tell you:

* where you struggled
* where architecture failed
* how your project evolved

Gitspect does.

---

## Installation

```bash
npm install -g gitspect
```

or

```bash
cargo install gitspect
```

or 
```bash
npx gitspect
```
---

## Roadmap

* repo insights
* developer analytics
* architecture detection
* plugin system
* local AI support

---

## License

MIT
