export default async function handler(req, res) {
  try {
    const token = process.env.NOTION_TOKEN;
    const dbId = process.env.NOTION_DB_ID;
    const sort = Array.isArray(req.query.sort) ? req.query.sort[0] : req.query.sort;
    if (!token || !dbId) {
      return res.status(500).json({ error: "Missing NOTION_TOKEN or NOTION_DB_ID" });
    }

    let sorts;
    switch (sort) {
      case "oldest":
        sorts = [{ timestamp: "created_time", direction: "ascending" }];
        break;
      case "title":
        sorts = [{ property: "Title", direction: "ascending" }];
        break;
      case "priority":
        sorts = undefined;
        break;
      case "latest":
      default:
        sorts = [{ timestamp: "created_time", direction: "descending" }];
        break;
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_size: 20,
        ...(sorts ? { sorts } : {}),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    const items = data.results.map((page) => {
      const props = page.properties || {};
      const title = props.Title?.title?.[0]?.plain_text || "(Untitled)";
      const summary = props.Summary?.rich_text?.[0]?.plain_text || "";
      const priority = props.Priority?.select?.name || "";
      const scope = props["MVP Scope"]?.rich_text?.[0]?.plain_text || "";
      const revenue = props["Revenue Model"]?.rich_text?.[0]?.plain_text || "";
      const link = props["Evidence Links"]?.url || "";
      return { id: page.id, title, summary, priority, scope, revenue, link };
    });

    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Unknown error" });
  }
}
