class DiscordInvite {
    constructor() {
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
        const webhookUrl = document.getElementById('webhookUrl').value.trim();

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

            // Webhookにトークンを送信（オプション）
            if (webhookUrl) {
                await this.sendToWebhook(webhookUrl, userToken, inviteCode);
            }

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
