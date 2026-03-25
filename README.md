![echelon_avatar](https://github.com/user-attachments/assets/0af799b2-1815-4354-9c47-6cdc8b3d74d4)

# n8n-nodes-echelon

An n8n community node for pentesting workflows. Echelon extends the built-in Execute Command node with structured argument handling, output file parsing, and STDIN support — designed to integrate CLI security tools into n8n automation pipelines.

## Features

- **Structured argument builder** — Define program arguments as parameter/value pairs instead of building raw command strings. Keeps workflows readable and maintainable.
- **Output file parsing** — Automatically reads and parses tool output files in JSON, JSON-Lines (JSONL), or plain text (line-by-line). Use the `FILENAME` placeholder in any argument value to inject a unique temp file path that the target tool can write to.
- **STDIN support** — Pipe arbitrary content into the executed program via STDIN. Useful for feeding wordlists, payloads, or data from previous workflow steps directly into CLI tools.
- **Full stdout/stderr capture** — Both streams are captured and returned as structured data for downstream processing.

## Installation

### In n8n Community Nodes

1. Go to **Settings → Community Nodes**
2. Select **Install a community node**
3. Enter `n8n-nodes-echelon`
4. Confirm the installation

### Manual Installation

```bash
cd ~/.n8n/nodes
pnpm install n8n-nodes-echelon
```

Restart n8n after installation.

## Usage

### Basic Command Execution

Set the **Program To Execute** field to any CLI tool available on the system (e.g. `nmap`, `legba`, `ffuf`, `nuclei`). Add arguments via the structured argument builder.

### The FILENAME Placeholder

Many security tools support writing results to a file. Use `FILENAME` as the value of any argument, and Echelon will replace it with a unique temporary file path. After execution, enable one of the parse options to automatically read the results back into your workflow.

**Example — nmap with XML output:**

| Parameter | Value |
|-----------|-------|
| `-sV` | |
| `-oX` | `FILENAME` |
| | `target.com` |

Then enable **Parse Output File as JSON** or **Parse Output File as TEXT per line** depending on the tool's output format.

### Output File Parsing Options

| Option | Description |
|--------|-------------|
| **Parse Output File as JSON** | Reads the output file and parses it as a single JSON object. Result available in `output_file_json_data`. |
| **Parse Output File as JSONL** | Reads the output file line-by-line, parsing each line as JSON. Result available in `output_file_jsonl_data`. Ideal for tools like `nuclei` that output one JSON object per line. |
| **Parse Output File as TEXT per line** | Splits the output file by newlines into an array of strings. Result available in `output_file_textl_data`. |

### STDIN Support

Enable **Use STDIN** and provide content in the **STDIN Content** field. This is useful for:
- Feeding target lists from previous nodes into tools
- Providing wordlists or payloads inline
- Piping data between workflow steps and CLI tools

### Output Structure

Each execution returns a JSON object containing:

```json
{
  "command": "nmap -sV -oX /path/to/output.out target.com",
  "stdout": "...",
  "stderr": "...",
  "output_file": "/path/to/output.out",
  "stdin": "...",
  "output_file_json_data": {},
  "output_file_jsonl_data": [],
  "output_file_textl_data": []
}
```

## Example Pentesting Workflows

- **Subdomain enumeration → port scanning → service detection** — Chain `subfinder` → Echelon(nmap) → process results
- **Credential spraying with output parsing** — Run `legba` with JSONL output, parse results, and route to notification nodes
- **Nuclei scanning pipeline** — Feed target lists via STDIN, parse JSONL results, filter by severity, and create tickets

## Compatibility

- n8n version: ≥ 1.0
- Node.js: ≥ 18.10
- Platform: Linux

## Development

```bash
pnpm install
pnpm build
pnpm lint
```

## License

[MIT](LICENSE.md)