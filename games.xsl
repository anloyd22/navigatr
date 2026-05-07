<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:template match="/">
<html>
<head>
<title>NAVIGATR - Games Report</title>
<style>
body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; background: #0a0a0a; color: #fff; }
h1 { color: #e94560; border-bottom: 2px solid #e94560; padding-bottom: 10px; }
.report-info { margin: 20px 0; color: #aaa; }
table { width: 100%; border-collapse: collapse; background: #1e1e2e; border-radius: 10px; overflow: hidden; }
th { background: #e94560; color: white; padding: 12px; text-align: left; }
td { padding: 10px; border-bottom: 1px solid #3a3a4e; }
tr:hover { background: #3a3a4e; }
.footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
</style>
</head>
<body>
<h1>🎮 NAVIGATR - Games Report</h1>
<div class="report-info">
<p>Generated: <xsl:value-of select="current-dateTime()"/></p>
<p>Total Games: <xsl:value-of select="count(games/game)"/></p>
</div>
<table>
<thead>
<tr>
<th>ID</th>
<th>Name</th>
<th>Category</th>
<th>Description</th>
<th>Price</th>
<th>Date Added</th>
</tr>
</thead>
<tbody>
<xsl:for-each select="games/game">
<tr>
<td><xsl:value-of select="id"/></td>
<td><xsl:value-of select="name"/></td>
<td><xsl:value-of select="category"/></td>
<td><xsl:value-of select="description"/></td>
<td>₱<xsl:value-of select="price"/></td>
<td><xsl:value-of select="created_at"/></td>
</tr>
</xsl:for-each>
</tbody>
</table>
<div class="footer">
<p>NAVIGATR Game Store - Official Report</p>
</div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
