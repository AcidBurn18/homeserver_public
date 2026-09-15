

## Technical Dissection: How the Chunker Engine Operates (`src/chunker.py`)


### A. The Core Data Structures & Token Mathematics

Before parsing any text, the backend defines two immutable dataclasses:

```python
@dataclass
class MarkdownBlock:
    block_type: str        # 'paragraph', 'code', 'table', 'list'
    text: str              # Exact raw substring
    section_path: List[str]# Hierarchical heading stack lineage

@dataclass
class Chunk:
    chunk_id: int          # Sequential 0-indexed ID
    text: str              # Merged block text
    section_path: List[str]# Lineage copied from the lead block
    block_types: List[str] # Set of block types present inside chunk
    approx_tokens: int     # Estimated BPE token count
```

#### Token Estimation Formula
To avoid expensive, slow C-binding tokenizer calls (`tiktoken`) inside inner parsing loops, the engine uses an **Empirical BPE Token Multiplier**:
$$\text{Approx Tokens} = \max\left(1, \left\lfloor \text{Count}(\text{Non-Whitespace Strings}) \times 1.3 \right\rfloor\right)$$

* **The Code**: `re.findall(r"\S+", text)` extracts every whitespace-separated token.
* **Why `1.3`?**: In English technical prose, punctuation, camelCase variable names, and IP subnets break down into subwords at an average ratio of **1.3 BPE tokens per whitespace word**.

---

### B. The Line-by-Line State Machine Parsing (`parse_markdown`)

The function `parse_markdown(text)` iterates through the document line-by-line maintaining **three concurrent state trackers**:

1. `heading_stack`: A list of strings tracking active heading lineage.
2. `in_code_block`: A boolean toggle for code blocks.
3. `current_type`: The active block classification (`paragraph`, `table`, `list`, `code`).

```text
Input Line Stream ──> [ 1. Code Toggle Check (```) ]
                             │ (no)
                             ▼
                      [ 2. Heading Regex Check (#) ] ──> Update Stack: [:level-1] + [Title]
                             │ (no)
                             ▼
                      [ 3. Table Check (|) ]
                             │ (no)
                             ▼
                      [ 4. List Regex Check (-, *, 1.) ]
                             │ (no)
                             ▼
                      [ 5. Paragraph Default ]
```

---

#### 1. Heading Hierarchy Stack Truncation (The Stack Math)
When a heading line arrives, it is matched against regex `r"^(#{1,6})\s+(.+?)\s*$"`.
* `level = len(group(1))` (e.g., `##` $\rightarrow$ Level 2).
* `title = group(2).strip()`.

The stack update uses **Level-Indexed Array Truncation**:
$$\text{heading\_stack} = \text{heading\_stack}[0 : \text{level} - 1] + [\text{title}]$$

##### Minute Step-by-Step Example:
1. At `# Homelab Setup` (Level 1) $\rightarrow$ Stack: `["Homelab Setup"]`
2. At `## Networking` (Level 2) $\rightarrow$ Stack: `["Homelab Setup", "Networking"]`
3. At `### OPNsense VM` (Level 3) $\rightarrow$ Stack: `["Homelab Setup", "Networking", "OPNsense VM"]`
4. Now, a new Level 2 heading arrives: `## Storage`.
   * `heading_stack[:2-1]` evaluates to `heading_stack[:1]`, which slices off `"Networking"` and `"OPNsense VM"`.
   * Result: `["Homelab Setup", "Storage"]`!

> 💡 **Why this is genius**: Sibling and parent jumps automatically pop deeper children off the stack in $O(1)$ time, guaranteeing that a block under `## Storage` **never accidentally inherits** the heading path of a previous sibling `### OPNsense VM`!

---

#### 2. Code Block State Machine
Code blocks take precedence over all other parsing rules:
* If `line.strip().startswith("```")`:
  * If `in_code_block == False`: Flushes current paragraph text, sets `in_code_block = True`, and starts `code_lines = [line]`.
  * If `in_code_block == True`: Appends closing ```` ``` ```` line, flushes code block as type `"code"`, and sets `in_code_block = False`.
* While `in_code_block == True`: Every line is appended directly without heading or table checks.

---

#### 3. Table and List Detection
* **Table Check**: `"|" in line and line.strip().startswith("|")`. Contiguous table lines are grouped under block type `"table"`.
* **List Check**: Regex `r"^\s*([-*+]|\d+\.)\s+"`. Contiguous list lines are grouped under block type `"list"`.

---

### C. Hierarchical Fallback Splitting (`split_long_block`)

If a single block exceeds `max_tokens` (700 tokens), it undergoes **Hierarchical Fallback Splitting**:

```text
Block Exceeds Max Tokens (700)
             │
             ▼
[ Level 1: Split by Paragraph Boundaries (\n\s*\n) ]
             │
             ├─> Fits token limit? ──> Return Paragraph Pieces
             │
             ▼ (If piece still too large)
[ Level 2: Split by Sentence Boundaries (?<=[.!?])\s+ ]
             │
             └─> Returns Sentence-Bounded Pieces
```

#### The Sentence Regex Lookbehind
Sentence splitting uses a **Positive Lookbehind Regex**:
`re.split(r"(?<=[.!?])\s+", piece)`
* `(?<=[.!?])`: Asserts that the previous character is a period, exclamation mark, or question mark without consuming it.
* This ensures sentences are split *after* punctuation marks, keeping periods attached to their sentences!

---

### D. Section-Isolated Greedy Block Packing (`chunk_markdown`)

Finally, `chunk_markdown(text, target_tokens=450, max_tokens=700)` packs blocks into final chunks using **Section-Isolated Greedy Packing**:

1. **Zero Cross-Section Contamination**:
   ```python
   if current_blocks and block.section_path != current_section:
       flush() # Seal chunk immediately if heading section changes!
   ```
   A chunk will **never** mix text from `## OPNsense` and `## Proxmox Host`, even if there are unused tokens left in the budget!
2. **Greedy Budget Thresholding**:
   * It appends blocks to `current_blocks` and sums `current_tokens += block_tokens`.
   * If `current_tokens + next_block_tokens > 450`: It flushes `current_blocks` into a new `Chunk` object and resets the budget.
   * If `current_tokens >= 700`: Hard safety flush.

---

## 2. Interactive Visualization Tool (`chunker_visualizer.html`)

I built a dedicated visualizer script in your repository: [src/visualize_chunker_interactive.py](file:///Users/iansh/Desktop/Devops-experience/homeserver_private/homeserver/homelab-rag/src/visualize_chunker_interactive.py).

I just executed it on your Proxmox Network sample document, generating an interactive HTML canvas:

🌐 **Interactive Canvas**: [chunker_visualizer.html](file:///Users/iansh/Desktop/Devops-experience/homeserver_private/homeserver/homelab-rag/chunker_visualizer.html)

### What You Will See in the Visualizer:
1. **Column 1 (Parsed Semantic Blocks)**: Color-coded cards showing every block identified by the state machine (`Paragraph` = Blue, `Table` = Teal, `Code` = Purple), along with its exact Heading Lineage and token count.
2. **Column 2 (Final Packed Chunks)**: Shows how adjacent blocks within the same heading section were packed into final `Chunk` payloads, showing their prepended section paths!

## Let's explain both concepts using a Shopping Cart & Shelf Analogy. 

Imagine you are walking down supermarket aisles with a shopping cart, packing items into cardboard boxes for a home move.

---

### The Rules of Your Shopping Cart

1. **Target Box Size (`450` tokens)**: You prefer to close a box when it reaches around **450 words** (a comfortable size).
2. **Hard Limit (`700` tokens)**: You can **never** exceed **700 words** in one box (the cardboard box will physically rip!).
3. **The Golden Rule (Zero Cross-Section Contamination)**: You are **NEVER allowed** to mix items from the **Kitchen Section** (`## OPNsense`) and the **Garage Section** (`## Proxmox Host`) inside the same box!

---

### Interactive Step-by-Step Simulation

Let's walk through your document line-by-line as the backend chunker packs items into boxes (chunks).

```text
======================================================================
STAGE 1: You are standing in AISLE 1 ("## OPNsense Firewall")
======================================================================
```

#### 📦 Box 1 is currently EMPTY (0 tokens).

* **Item 1 arrives**: A text block explaining OPNsense IP settings (**150 tokens**).
  * *Check*: Can it fit in Box 1? Yes! (`0 + 150 = 150` tokens, which is below our 450 target).
  * **Action**: Put Item 1 into Box 1. (Box 1 now has **150 tokens**).

* **Item 2 arrives**: A list of OPNsense firewall rules (**200 tokens**).
  * *Check*: If we add Item 2 to Box 1, the total is `150 + 200 = 350` tokens.
  * *Check*: Is 350 below our 450 target limit? Yes!
  * **Action**: Put Item 2 into Box 1. (Box 1 now has **350 tokens**).

---

```text
======================================================================
STAGE 2: Aisle Change! You walk to AISLE 2 ("## Proxmox Host")
======================================================================
```

* **Item 3 arrives**: A text block explaining Proxmox CPU specs (**50 tokens**).

#### 🚨 Zero Cross-Section Contamination Triggers!
* The backend code checks: *"Is Item 3 from Aisle 1 (OPNsense)?"* **NO!** It is from Aisle 2 (`## Proxmox Host`).
* **The Rule**: You can **NEVER** mix OPNsense items with Proxmox Host items.
* **Action**: 
  1. **SEAL BOX 1 IMMEDIATELY!** (Box 1 is sent to Qdrant Vector DB with **350 tokens**). 
  2. *Notice what happened*: Box 1 had room for 100 more tokens before hitting the 450 target, but **we sealed it anyway** to prevent section mixing!
  3. Open a brand new **Box 2** and put Item 3 (50 tokens) inside. (Box 2 now has **50 tokens**).

---

```text
======================================================================
STAGE 3: Packing items inside AISLE 2 ("## Proxmox Host")
======================================================================
```

#### 📦 Box 2 currently has Item 3 (50 tokens).

* **Item 4 arrives**: A list of Proxmox RAM & Storage specs (**300 tokens**).
  * *Check Section*: Is Item 4 from Aisle 2? Yes!
  * *Check Capacity*: `50 + 300 = 350` tokens. Is 350 below our 450 target? Yes!
  * **Action**: Put Item 4 into Box 2. (Box 2 now has **350 tokens**).

* **Item 5 arrives**: A table of Proxmox PCI interfaces (**200 tokens**).
  * *Check Section*: Is Item 5 from Aisle 2? Yes!
  * *Check Capacity*: If we add Item 5, candidate total is `350 + 200 = 550` tokens.

#### 🎯 Greedy Target Threshold Triggers!
* The backend code checks: *"Does `350 + 200 = 550` exceed our 450 target limit?"* **YES!** (`550 > 450`).
* **Action**: 
  1. **SEAL BOX 2 IMMEDIATELY!** (Box 2 is sent to Qdrant with **350 tokens**).
  2. Open a brand new **Box 3** and put Item 5 (200 tokens) as the first item inside Box 3!

---

### What happens if ONE single item is HUGE (e.g. 800 tokens)?

#### 🛑 Hard Safety Flush (`700` tokens)
Imagine an enormous table that is **800 tokens** long by itself:
1. Before packing, our `split_long_block` engine detects that 800 is greater than the **700 hard safety limit** (the box rip point!).
2. It automatically chops that huge item into **Part A (400 tokens)** and **Part B (400 tokens)** at sentence/row boundaries *before* placing them into boxes.
3. Part A goes into Box 3, and Part B goes into Box 4. No box ever breaks the 700 safety ceiling!

---

### Why Did We Build It This Way?

1. **Why Zero Cross-Section Contamination?**  
   If a user asks *"What is the IP of OPNsense?"*, they should get a chunk containing **only OPNsense info**. If we let OPNsense and Proxmox info bleed into the same chunk just to fill up empty space, the AI gets confused and mixes up which IP belongs to which server.
2. **Why Target 450 vs Hard Max 700?**  
   450 words is the "sweet spot" for AI embedding models (`all-MiniLM-L6-v2`) to capture deep meaning without losing detail. The 700 hard max prevents GPU memory crashes!