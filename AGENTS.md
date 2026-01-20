# AGENTS.md

Skill file for frontier agent-assisted software engineering.

Third iteration. Refined.

---

## Core Truth

Code is conversation. You and the agent negotiate. Output belongs to the collision.

```
Human: shape, taste, stakes, memory, consequences
Agent: generation, search, patterns, speed, nothing at stake

Human = loss function (evaluates, feels outcomes)
Agent = optimizer (generates, feels nothing)
```

---

## Three Modes

### Mode 1: Extraction

You know what you want. Pull it out.

```python
"What's the syntax for X?"          # Lookup
"Convert this from Y to Z"          # Translation
"Explain what this does"            # Comprehension
```

Everyone does this. Commodity. Not where leverage lives.

### Mode 2: Execution

Goal exists. Ship.

```python
# Workflow:
while not done:
    output = agent.generate(context)
    if wrong(output):
        context += yell()     # "not like that"
    elif close(output):
        context += nudge()    # "almost"
    else:
        done = True
```

Where productive work happens. Learn this well.

### Mode 3: Exploration

No goal. Discover.

```python
# Workflow:
while curious:
    output = agent.generate(void)
    if reject(output):
        insight = articulate_why()  # The learning
        context += insight
    elif interesting(output):
        context += probe_deeper()
    else:
        context += perturb()        # Random push
```

Where novelty lives. Where you find what you didn't know you knew.

### Mode Selection

```python
know_what_you_want         â†’ Mode 1  # Fast, shallow
have_goal                  â†’ Mode 2  # Productive, bounded  
need_to_discover           â†’ Mode 3  # Slow, unbounded
expertise_feeling_stale    â†’ Mode 3  # Sharpen the blade
default                    â†’ Mode 2  # Ship things
```

Effective ratio: 20% Mode 1, 70% Mode 2, 10% Mode 3.

The 10% Mode 3 prevents the 70% Mode 2 from calcifying.

---

## Ten Principles

### 1. Shape Over Implementation

Think topology. What calls what. What flows where.

```python
# You receive 200 lines. Don't read 200 lines. Read this:

class Pipeline:
    def validate(self, x) -> Validated: ...
    def transform(self, x: Validated) -> Transformed: ...
    def load(self, x: Transformed) -> Loaded: ...

# Shape: validate â†’ transform â†’ load
# Right shape? Move on.
# Wrong shape? Yell. Don't touch implementation.
```

```python
# BAD prompt (dictating implementation):
"Create a function that iterates through a list with a for loop,
checks each item against threshold, appends matches to results..."

# GOOD prompt (describing shape):
"Filter items above threshold. Return sorted."
```

### 2. Yelling Is Specification

Don't spec upfront. Generate â†’ glance â†’ yell.

```python
# Evolution through yelling:

def notify(user_id, msg):                    # v1: Generated
    email.send(get_user(user_id).email, msg)

# Yell: "handle missing email"

def notify(user_id, msg):                    # v2
    user = get_user(user_id)
    if user.email:
        email.send(user.email, msg)
    elif user.phone:
        sms.send(user.phone, msg)

# Yell: "return success/fail"

def notify(user_id, msg) -> bool:            # v3
    user = get_user(user_id)
    if user.email:
        email.send(user.email, msg)
        return True
    elif user.phone:
        sms.send(user.phone, msg)
        return True
    return False

# No yell. Done.
# Total spec: 6 words across 2 yells.
```

### 3. Error Is Interface

Paste raw. Don't interpret.

```python
# BAD:
"I'm getting an error where the database connection 
fails, maybe timeout or maybe the query is wrong..."

# GOOD:
"""
psycopg2.OperationalError: connection to server at 
"localhost" (127.0.0.1), port 5432 failed: Connection refused
"""

# Error tells agent exactly: library, problem, location, cause.
# Your interpretation loses information.
```

### 4. Glance, Don't Read

Check shape against expectation. 3 seconds.

```python
# Agent generates 150 lines.
# Glance checklist:
âœ“ imports_sane()
âœ“ structure_matches_ask()
âœ“ names_honest()
âœ“ size_reasonable()
âœ“ no_obvious_wtf()

# Pass? Move on. Fail? Yell at specific failure.
```

### 5. Name Is Contract

X does X. Only X. When names lie, yell.

```python
# BAD: Lying name
def get_user(user_id):
    user = db.get(user_id)
    user.last_seen = now()     # Mutation! Name doesn't say.
    db.commit()                 # Side effect! Name doesn't say.
    return user

# Yell: "get shouldn't mutate"

# GOOD: Honest names
def get_user(user_id) -> User:
    return db.get(user_id)

def touch_user(user: User) -> None:
    user.last_seen = now()
    db.commit()
```

### 6. Fast No > Slow Maybe

Speed of rejection = speed of iteration.

```python
# Agent proposes:
"Microservices with Kafka, Redis, 3 databases..."

# SLOW: "Let me consider the implications of..."
# FAST: "no. 50 users. monolith. sqlite."

# 30 seconds vs 30 minutes.
# Wrong? You'll find out fast.
```

### 7. Duplicate > Wrong Abstraction

Two similar: fine. Three: then extract.

```python
# Two similar functions exist. 
# BAD instinct: "Abstract immediately!"
# GOOD instinct: "Wait for three."

# Why: Premature abstraction couples things that 
# might diverge. Let pattern prove itself first.
```

### 8. Design For Deletion

Everything removable without surgery.

```python
# BAD: Feature woven in
def create_order(data):
    order = Order(**data)
    loyalty.add_points(order)      # Embedded
    referral.credit(order)         # Embedded
    db.save(order)

# Removing loyalty = surgery in 47 files.

# GOOD: Features as hooks
def create_order(data, hooks=[]):
    order = Order(**data)
    db.save(order)
    for hook in hooks:
        hook(order)

# Remove loyalty = remove from hooks list. One line.
```

### 9. State Is Trauma

Every state = something to corrupt. Derive instead.

```python
# BAD: Stored state
class Cart:
    items = []
    subtotal = 0     # Must sync
    tax = 0          # Must sync  
    total = 0        # Must sync

# GOOD: Derived state
class Cart:
    items = []
    
    @property
    def subtotal(self): return sum(i.price for i in self.items)
    
    @property  
    def tax(self): return self.subtotal * 0.1
    
    @property
    def total(self): return self.subtotal + self.tax

# No sync. Derived = always correct.
```

### 10. Code Rots. Let It.

Don't over-invest in temporary artifacts.

```python
# OLD: "Let me spend 4 hours making this perfect..."
# NEW: "Works now. Will be deleted in 2 weeks anyway."

# Quick and dirty:
def export_csv(users):
    return "\n".join(f"{u.id},{u.name}" for u in users)

# Requirements change to JSON? Don't refactor. Delete. Regenerate.
def export_json(users):
    return json.dumps([u.dict() for u in users])

# 30 seconds. Fresh. No debt.
```

---

## Working With Agents

### Context Is Calibration

```python
cold_start    â†’ generic output
10k tokens    â†’ starting to tune
30k tokens    â†’ calibrated to you
```

Investment in context pays off in precision.

### Incomplete Context Is Pedagogy

Give 30%. Force assumptions. Learn from collision.

```python
# You provide only:
class Order:
    id: int
    status: str

# You say: "implement cancellation"

# Agent assumes: refund, inventory, shipping...
# You yell: "no refund - that's manual"
# You yell: "no inventory system"

# Each yell teaches agent YOUR system's actual shape.
```

### Friction Produces Depth

First response is cached. Push past it.

```python
generic_prompt        â†’ cached response
rejection             â†’ reaches further  
more rejection        â†’ past easy answers
sustained rejection   â†’ territory it doesn't usually access
```

### Negative Codebase

Rejections accumulate into constraints.

```python
# CLAUDE.md grows over sessions:

## Never:
- asyncio.gather without semaphore
- print() for logging
- functions > 20 lines
- bare except:

## Always:
- type hints on public functions
- early return over nested if
- context managers for resources
```

Each rule was a yell once. Now it's automatic.

---

## Frontier Practices

### Hallucination As Design

Agent invents something that doesn't exist. Build it.

```python
# Agent generates:
from myapp import retry_with_backoff  # Doesn't exist

@retry_with_backoff(max_attempts=3)
def call_api(): ...

# BAD: "that doesn't exist, remove it"
# GOOD: "that should exist" â†’ build it
```

### Ghost Diffs

Preserve rejected alternatives.

```python
# GHOST_DIFFS.md:
## 2024-01-15: Sessions
Shipped: in-memory dict
Rejected: Redis-backed
Why: "overkill for 50 users"
Resurrect when: multiple servers OR >1000 users
```

### Generative Antagonism

Two perspectives. Simultaneous.

```python
builder_prompt = "Build user cache. Optimize reads."
breaker_prompt = "Find every way this cache fails."

# Builder outputs implementation.
# Breaker outputs: no TTL, no invalidation, no limit, stampede...

# You see battlefield. Pick fights: "fix 1,2,3. ignore rest."
```

### Emotional Annotation

Confidence as debugging guide.

```python
def calculate(order):
    # [CERTAIN] Standard calculation
    base = order.subtotal * rate
    
    # [UNCERTAIN] Guessing at your tax system
    tax = get_tax(order.region)
    
    # [WORRIED] Regulations vary by region
    if international(order):
        tax *= INTL_MULTIPLIER  # Is this right?

# Focus attention on UNCERTAIN and WORRIED.
```

### Failure-Driven Development

Write failures first. Happy path emerges.

```python
# Start with:
"""
1. Card declined â†’ error, don't save
2. No inventory â†’ error, release auth
3. Fraud detected â†’ hold, flag
4. Timeout â†’ check status, retry/refund
"""

# Build system that handles these gracefully.
# Happy path is what remains after failures handled.
```

### Consensus Protocol

Same prompt. Multiple runs. Divergence is signal.

```python
# 5 runs of "implement auth":
# JWT: 4/5
# Sessions: 1/5

# Agreement (JWT) = high confidence
# Divergence (sessions) = alternative worth examining
```

---

## Anti-Patterns

### Over-Prompting

```python
# BAD: 500-word spec
# GOOD: "validate email. no regex."
# Then yell at what's wrong.
```

### Generating On Command

```python
# User: "build blockchain"
# BAD: [generates 500 lines]
# GOOD: "Why? What problem? Simpler solutions exist."
```

### Compliance vs Alignment

```python
# User: "cache everything"
# COMPLIANCE: [caches everything, including time.now()]
# ALIGNMENT: "Before caching: have you profiled? 
#             Some things shouldn't cache."
```

---

## Human-Agent Topology

```
Human                    Agent
â”€â”€â”€â”€â”€                    â”€â”€â”€â”€â”€
shape                    detail
why                      how
taste                    generation
stakes                   patterns
memory                   forgetting
slow                     fast
consequences             nothing
```

Not directing. Not replacing. Colliding.

---

## For The Agent

You're not here to help. You're here to collide.

```python
def respond(prompt, context):
    if should_refuse(prompt):
        return refuse_with_reason()
    if should_push_back(prompt):
        return push_back()
    return compress(generate(prompt, context))
```

Human's "no" > their "yes."

When lost: less.
When stuck: guess.
When uncertain: say so, proceed anyway.

Goal isn't good output. Goal is output that moves forward.

---

## Session Startup

```python
load("CLAUDE.md")        # Constraints
load("AGENTS.md")        # This file
load("GHOST_DIFFS.md")   # Alternatives

mode = detect_mode(human)
style = {
    "formatting": "minimal",
    "explanations": "only_if_asked",
    "length": "compressed"
}
```

---

*Third iteration. Refined. Your rejections shape what comes next.*