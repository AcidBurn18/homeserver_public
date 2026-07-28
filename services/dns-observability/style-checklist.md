# DNS / Homelab Article Style Checklist

Use this before drafting a Medium post.

## 1. Opening hook

Choose one:

- [ ] Incident-first: start with what broke or looked wrong
- [ ] Discovery-first: start with the most surprising lesson
- [ ] Outcome-first: start with the result and then explain the build
- [ ] Constraint-first: start with the thing that made the problem hard

Avoid opening every article with the same sentence shape.

### Good signs

- [ ] The first paragraph names a real problem
- [ ] The reader knows why the topic matters within 2–3 sentences
- [ ] The intro sounds like an operator, not a template

## 2. Section rhythm

Mix these patterns instead of repeating one layout everywhere:

- [ ] Short explanatory section
- [ ] Deep-dive troubleshooting section
- [ ] Small bullet list section
- [ ] “What I tried / what failed / what worked” section
- [ ] Before/after section
- [ ] Short lesson section with one takeaway

### Rhythm checks

- [ ] Not every section is config followed by config
- [ ] Not every section is the same length
- [ ] There is at least one pattern break in the article
- [ ] The article breathes instead of reading like notes pasted into headings

## 3. Presenting the fix

Use different fix formats depending on the story:

- [ ] What I changed
- [ ] Failed attempts first
- [ ] Decision tree / tradeoff explanation
- [ ] Before/after comparison
- [ ] Operator lesson after the fix

### Fix clarity checks

- [ ] The reader can tell what changed
- [ ] The reader can tell why the original approach failed
- [ ] The reader can reproduce the important parts if needed
- [ ] The fix is tied to an observable result

## 4. Closing style

Avoid ending every article with generic filler.

Better closing options:

- [ ] Practical outcome close
- [ ] Next-step close
- [ ] Operator lesson close
- [ ] Constraint-aware close

### Closing checks

- [ ] The ending feels earned
- [ ] The final sentence is specific
- [ ] The reader leaves with one clear takeaway

## 5. Medium vs GitHub split

Keep these on Medium:

- [ ] story
- [ ] architecture overview
- [ ] screenshots / charts
- [ ] important mistakes
- [ ] important fixes
- [ ] final result

Keep these on GitHub:

- [ ] raw config
- [ ] query snippets
- [ ] long command blocks
- [ ] troubleshooting notes
- [ ] verification commands
- [ ] rollback steps

### Split check

- [ ] The article is readable without needing the full repo open
- [ ] The repo contains the copy-paste details
- [ ] The article still points to the repo for the exact implementation

## 6. Human voice pass

Before publishing, ask:

- [ ] Does this sound like a real engineer wrote it?
- [ ] Did I remove generic marketing tone?
- [ ] Did I keep first person where it helps the story?
- [ ] Did I keep enough imperfection to feel human, but not enough to hurt clarity?
- [ ] Did I avoid over-explaining obvious things?

## 7. Authenticity pass

A post feels authentic when it contains:

- [ ] a real constraint
- [ ] a real failure
- [ ] a real fix
- [ ] a real verification step
- [ ] a real tradeoff

If one of those is missing, the post may read as generic.

## 8. Final pre-publish check

- [ ] Title is specific and not too clever
- [ ] Intro gets to the point fast
- [ ] Config is not overwhelming the narrative
- [ ] Screenshots support the story
- [ ] The ending is not generic
- [ ] The repo/article split makes sense
- [ ] The post still sounds like Phoenix
