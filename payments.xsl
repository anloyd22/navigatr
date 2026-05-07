<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="/">
        <html>
            <head>
                <title>NAVIGATR - Payments Report</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        margin: 30px;
                        background: #0a0a0a;
                        color: #fff;
                    }
                    h1 {
                        color: #e94560;
                        border-bottom: 2px solid #e94560;
                        padding-bottom: 10px;
                    }
                    .report-info {
                        margin: 20px 0;
                        color: #aaa;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        background: #1e1e2e;
                        border-radius: 10px;
                        overflow: hidden;
                    }
                    th {
                        background: #e94560;
                        color: white;
                        padding: 12px;
                        text-align: left;
                    }
                    td {
                        padding: 10px;
                        border-bottom: 1px solid #3a3a4e;
                    }
                    tr:hover {
                        background: #3a3a4e;
                    }
                    .status-completed {
                        color: #00a86b;
                        font-weight: bold;
                    }
                    .footer {
                        margin-top: 20px;
                        text-align: center;
                        color: #666;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <h1>💰 NAVIGATR - Payments Report</h1>
                <div class="report-info">
                    <p>Generated: <xsl:value-of select="current-dateTime()"/></p>
                    <p>Total Payments: <xsl:value-of select="count(payments/payment)"/></p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Payment ID</th>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Payment Method</th>
                            <th>Status</th>
                            <th>Transaction ID</th>
                            <th>Date</th>
                          </tr>
                    </thead>
                    <tbody>
                        <xsl:for-each select="payments/payment">
                            <tr>
                                <td><xsl:value-of select="payment_id"/></td>
                                <td><xsl:value-of select="order_id"/></td>
                                <td><xsl:value-of select="username"/></td>
                                <td>₱<xsl:value-of select="amount"/></td>
                                <td><xsl:value-of select="payment_method"/></td>
                                <td>
                                    <xsl:choose>
                                        <xsl:when test="payment_status='completed'">
                                            <span class="status-completed">✅ Completed</span>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <span>⏳ Pending</span>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </td>
                                <td><xsl:value-of select="transaction_id"/></td>
                                <td><xsl:value-of select="payment_date"/></td>
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
