import re
from dataclasses import dataclass, field
from typing import List


@dataclass
class MarkdownBlock:
    block_type: str
    text: str
    section_path: List[str] = field(default_factory=list)


@dataclass
class Chunk:
    chunk_id: int
    text: str
    section_path: List[str]
    block_types: List[str]
    approx_tokens: int


def approx_token_count(text: str) -> int:
    words = re.findall(r"\S+", text)
    return max(1, int(len(words) * 1.3))


def parse_markdown(text: str) -> List[MarkdownBlock]:

    lines = text.splitlines()

    blocks = []

    heading_stack = []

    current_lines = []
    current_type = None

    in_code_block = False
    code_lines = []

    def section_path():
        return heading_stack.copy()

    def flush_current():

        nonlocal current_lines, current_type

        if current_lines:

            block_text = "\n".join(current_lines).strip()

            if block_text:
                blocks.append(
                    MarkdownBlock(
                        block_type=current_type or "paragraph",
                        text=block_text,
                        section_path=section_path(),
                    )
                )

        current_lines = []
        current_type = None

    def flush_code():

        nonlocal code_lines

        if code_lines:

            blocks.append(
                MarkdownBlock(
                    block_type="code",
                    text="\n".join(code_lines).strip(),
                    section_path=section_path(),
                )
            )

        code_lines = []

    for line in lines:

        # ---------------------------------------------------------
        # CODE
        # ---------------------------------------------------------

        if line.strip().startswith("```"):

            if not in_code_block:

                flush_current()

                in_code_block = True
                code_lines = [line]

            else:

                code_lines.append(line)

                flush_code()

                in_code_block = False

            continue

        if in_code_block:

            code_lines.append(line)
            continue

        # ---------------------------------------------------------
        # HEADING
        # ---------------------------------------------------------

        heading_match = re.match(
            r"^(#{1,6})\s+(.+?)\s*$",
            line,
        )

        if heading_match:

            flush_current()

            level = len(heading_match.group(1))
            title = heading_match.group(2).strip()

            # Correct heading hierarchy.
            #
            # Example:
            #
            # ## Proxmox Bridges
            # ### OPNsense VM
            # ### Important Concepts
            #
            # becomes:
            #
            # Proxmox Bridges
            #   └── OPNsense VM
            #
            # and:
            #
            # Important Concepts
            #
            # is a sibling of OPNsense VM.

            heading_stack = heading_stack[: level - 1]

            heading_stack.append(title)

            continue

        # ---------------------------------------------------------
        # TABLE
        # ---------------------------------------------------------

        is_table_row = (
            "|" in line
            and line.strip().startswith("|")
        )

        if is_table_row:

            if current_type not in (None, "table"):
                flush_current()

            current_type = "table"
            current_lines.append(line)

            continue

        # ---------------------------------------------------------
        # LIST
        # ---------------------------------------------------------

        is_list = bool(
            re.match(
                r"^\s*([-*+]|\d+\.)\s+",
                line,
            )
        )

        if is_list:

            if current_type not in (None, "list"):
                flush_current()

            current_type = "list"
            current_lines.append(line)

            continue

        # ---------------------------------------------------------
        # BLANK LINE
        # ---------------------------------------------------------

        if not line.strip():

            flush_current()
            continue

        # ---------------------------------------------------------
        # NORMAL TEXT
        # ---------------------------------------------------------

        if current_type not in (None, "paragraph"):
            flush_current()

        current_type = "paragraph"
        current_lines.append(line)

    # Final block

    if in_code_block:
        flush_code()
    else:
        flush_current()

    return blocks


def split_long_block(
    block: MarkdownBlock,
    max_tokens: int,
) -> List[MarkdownBlock]:

    if approx_token_count(block.text) <= max_tokens:
        return [block]

    # Tables and code are preferably atomic.
    # Only split if absolutely necessary.
    if block.block_type in ("table", "code"):

        lines = block.text.splitlines()

        pieces = []
        current = []

        for line in lines:

            candidate = "\n".join(
                current + [line]
            )

            if (
                current
                and approx_token_count(candidate)
                > max_tokens
            ):

                pieces.append("\n".join(current))
                current = [line]

            else:

                current.append(line)

        if current:
            pieces.append("\n".join(current))

    else:

        # Paragraphs/lists:
        # prefer paragraph boundaries first.

        paragraphs = re.split(
            r"\n\s*\n",
            block.text,
        )

        pieces = []

        current = []

        for paragraph in paragraphs:

            candidate = "\n\n".join(
                current + [paragraph]
            )

            if (
                current
                and approx_token_count(candidate)
                > max_tokens
            ):

                pieces.append("\n\n".join(current))
                current = [paragraph]

            else:

                current.append(paragraph)

        if current:
            pieces.append("\n\n".join(current))

        # If one paragraph is still too large,
        # fall back to sentence boundaries.

        final_pieces = []

        for piece in pieces:

            if approx_token_count(piece) <= max_tokens:

                final_pieces.append(piece)
                continue

            sentences = re.split(
                r"(?<=[.!?])\s+",
                piece,
            )

            current = []

            for sentence in sentences:

                candidate = " ".join(
                    current + [sentence]
                )

                if (
                    current
                    and approx_token_count(candidate)
                    > max_tokens
                ):

                    final_pieces.append(
                        " ".join(current)
                    )

                    current = [sentence]

                else:

                    current.append(sentence)

            if current:
                final_pieces.append(
                    " ".join(current)
                )

        pieces = final_pieces

    return [
        MarkdownBlock(
            block_type=block.block_type,
            text=piece.strip(),
            section_path=block.section_path.copy(),
        )
        for piece in pieces
        if piece.strip()
    ]


def _build_chunk(
    chunk_id: int,
    blocks: List[MarkdownBlock],
) -> Chunk:

    text = "\n\n".join(
        block.text
        for block in blocks
    )

    block_types = []

    for block in blocks:

        if block.block_type not in block_types:
            block_types.append(block.block_type)

    return Chunk(
        chunk_id=chunk_id,
        text=text,
        section_path=blocks[0].section_path.copy(),
        block_types=block_types,
        approx_tokens=approx_token_count(text),
    )


def chunk_markdown(
    text: str,
    target_tokens: int = 450,
    max_tokens: int = 700,
) -> List[Chunk]:

    raw_blocks = parse_markdown(text)

    blocks = []

    for block in raw_blocks:

        blocks.extend(
            split_long_block(
                block,
                max_tokens,
            )
        )

    # -------------------------------------------------------------
    # IMPORTANT:
    #
    # We now group blocks INSIDE their section.
    #
    # We do not casually cross heading boundaries.
    # -------------------------------------------------------------

    chunks = []

    current_blocks = []
    current_section = None
    current_tokens = 0

    def flush():

        nonlocal current_blocks
        nonlocal current_section
        nonlocal current_tokens

        if current_blocks:

            chunks.append(
                _build_chunk(
                    len(chunks),
                    current_blocks,
                )
            )

        current_blocks = []
        current_section = None
        current_tokens = 0

    for block in blocks:

        block_tokens = approx_token_count(
            block.text
        )

        # New section → finish current chunk.
        if (
            current_blocks
            and block.section_path
            != current_section
        ):

            flush()

        if not current_blocks:

            current_section = (
                block.section_path.copy()
            )

        # Target exceeded → finish current chunk.
        if (
            current_blocks
            and current_tokens + block_tokens
            > target_tokens
        ):

            flush()

            current_section = (
                block.section_path.copy()
            )

        current_blocks.append(block)

        current_tokens += block_tokens

        # Absolute safety limit.
        if current_tokens >= max_tokens:

            flush()

    flush()

    return chunks