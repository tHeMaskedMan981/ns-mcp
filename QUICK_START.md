# Quick Start - OAuth 2.1 MCP Server

## 🚀 Deploy in 5 Minutes

### Step 1: Set Environment Variables

Create `.env`:
```bash
cp .env.example .env
```

Update for Railway (or your hosting):
```env
BASE_URL=https://your-app.railway.app
WIFI_PASSWORD=darktalent2024!
LUMA_API_KEY=your_key_here
```

### Step 2: Test Locally

```bash
npm install
npm run build
npm run start:http
```

Server starts on `http://localhost:3000`

### Step 3: Verify Endpoints

```bash
# Health check
curl http://localhost:3000/health

# OAuth discovery
curl http://localhost:3000/.well-known/oauth-authorization-server

# Stats
curl http://localhost:3000/stats
```

### Step 4: Deploy to Railway

```bash
git add .
git commit -m "Add OAuth 2.1"
git push
```

Set these in Railway dashboard:
- `BASE_URL`: Your Railway app URL
- `WIFI_PASSWORD`: `darktalent2024!`
- `LUMA_API_KEY`: Your key

### Step 5: Connect Claude Mobile

1. Open Claude mobile app
2. Settings → Integrations
3. Add MCP server: `https://your-app.railway.app/mcp`
4. Click "Connect"
5. Enter on login page:
   - **Name:** Your name
   - **Email:** your@email.com
   - **Password:** darktalent2024!
6. Click "Continue to Claude"
7. Done! 🎉

## Testing the Connection

Ask Claude:
```
"What events are happening at Network School this week?"
```

Claude will use your MCP server to fetch events!

## Monitor Usage

Visit: `https://your-app.railway.app/stats`

See:
- Total users
- Tool usage per user
- Most popular tools
- Active sessions

## Troubleshooting

**Can't connect?**
- Check BASE_URL is set in Railway
- Make sure server is running: visit `/health`
- Check logs: `railway logs`

**Wrong password?**
- Default: `darktalent2024!`
- Check `WIFI_PASSWORD` in Railway

**Token expired?**
- Tokens last 24 hours
- Just reconnect the server

## What You Built

✅ Full OAuth 2.1 with PKCE  
✅ WiFi password auth  
✅ Per-user tracking  
✅ Beautiful login UI  
✅ Usage statistics  
✅ Modern MCP protocol  

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Test with Claude Mobile  
3. 📊 Check `/stats` for usage
4. 🔥 Add more users
5. 📈 Monitor adoption

**That's it! Your MCP server is live with OAuth 2.1!** 🎉

For detailed docs: See [OAUTH_GUIDE.md](./OAUTH_GUIDE.md)

