# Wiki Guide

The MCP server includes a wiki feature that allows Claude to access Network School information on-demand.

## How It Works

The wiki system uses **MCP Resources** - a built-in protocol feature that allows Claude to:
1. List available wiki pages
2. Read specific pages when needed
3. Only consume tokens when accessing relevant content (very efficient!)

## Current Wiki Pages

- **visas.md** - Visa information for Malaysia, Singapore, and travel tips
- **getting-started.md** - Orientation guide for new arrivals
- **internet.md** - WiFi passwords and SIM card information

## Adding New Wiki Pages

### Step 1: Create a Markdown File

Create a new `.md` file in the `wiki/` directory:

```bash
cd wiki
nano transportation.md
```

### Step 2: Write Your Content

Use Markdown formatting:

```markdown
# Transportation

## Getting to Forest City

### From Kuala Lumpur

1. Take a bus from TBS (Terminal Bersepadu Selatan)
2. Journey takes approximately 4-5 hours
3. Cost: 30-50 MYR

### From Singapore

1. Take a taxi from Woodlands checkpoint
2. Journey takes approximately 30 minutes
3. Cost: 80-100 SGD

## Local Transportation

- Grab (ride-hailing app)
- Hotel shuttle service
- Bicycle rentals
```

### Step 3: Rebuild and Restart

```bash
npm run build
# Then restart Claude Desktop
```

### Step 4: Test

Ask Claude: "How do I get to Forest City from Kuala Lumpur?"

## Porting Content from Notion

If you have a Notion wiki:

1. **Export from Notion:**
   - Open your Notion page
   - Click "..." menu → "Export"
   - Choose "Markdown & CSV"
   - Download the zip file

2. **Clean up the exported files:**
   - Notion exports can be messy
   - Remove excess metadata
   - Fix any broken formatting
   - Simplify file names

3. **Copy to wiki folder:**
   ```bash
   cp ~/Downloads/Notion-Export/*.md wiki/
   ```

4. **Review and edit:**
   - Make sure formatting looks good
   - Update any outdated information
   - Remove private/sensitive information

## Best Practices

### File Naming
- Use lowercase with hyphens: `food-guide.md`
- Be descriptive: `visa-requirements.md` not `info.md`
- Keep it short but clear

### Content Structure
- Start with a clear H1 title: `# Visa Requirements`
- Use headers to organize: `## Malaysia`, `### Short-term Stays`
- Include practical information (dates, prices, links)
- Keep it concise - Claude can read multiple pages if needed

### Updating Information
- Review wiki pages periodically
- Update dates, prices, and policies
- Remove outdated content
- Add new information as NS evolves

## Example: Full Wiki Page

```markdown
# Food & Dining

## On-Site Options

### NS Cafe
- Location: Hotel lobby
- Hours: 7am - 10pm daily
- Menu: Coffee, pastries, light meals
- Price range: 10-30 MYR

### Hotel Restaurant
- Location: 2nd floor
- Hours: Breakfast 7-10am, Dinner 6-10pm
- Cuisine: International and local Malaysian
- Price range: 30-80 MYR

## Delivery Services

- **Grab Food** - Most popular, 20-40 minute delivery
- **Food Panda** - Good selection, similar delivery time
- **Shops nearby** - 15-minute walk to mini-market

## Nearby Restaurants

### In Forest City
- **Kopitiam** - Local coffee shop (5 min walk)
- **Subway** - Fast food (10 min walk)
- **Phoenix Mall** - Food court with many options (15 min drive)

### In Johor Bahru
- **Toppen Shopping Centre** - Multiple restaurants
- **City Square** - Mall with food court
- Takes 30-40 minutes by Grab

## Tips

- Most places accept cash (MYR)
- Download Grab app for food delivery
- Try local Malaysian food - it's amazing!
- Halal options widely available
```

## Token Efficiency

The wiki system is **very token-efficient** because:
- Pages are only loaded when Claude needs them
- Claude decides which pages to read based on your question
- You're not loading the entire wiki into every conversation
- Only relevant content is included in the context

## Troubleshooting

### Wiki page not showing up?
```bash
# Check if file exists
ls wiki/

# Make sure it's a .md file
mv wiki/mypage.txt wiki/mypage.md

# Rebuild
npm run build
```

### Content not updating?
```bash
# Rebuild the server
npm run build

# Restart Claude Desktop (Cmd+Q, then reopen)
```

### Testing without Claude
```bash
# Test the wiki system directly
npm run test:wiki
```

## Future Enhancements

Possible additions:
- Search tool for wiki content
- Auto-sync with Notion API
- Wiki page templates
- Version control for wiki edits
- Categories and tags for organization

