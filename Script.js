function joinDiscord() {
    const inviteCode = document.getElementById('inviteCode').value;
    const tokens = document.getElementById('tokens').value.split('\n').filter(token => token.trim() !== '');
    const baseUrl = `https://discord.com/api/v9/invites/${inviteCode}`;

    tokens.forEach(token => {
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // プロキシサーバーのURL
        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        };

        fetch(proxyUrl + baseUrl, options)
        .then(response => response.json())
        .then(data => {
            console.log(`トークン ${token} で参加しました:`, data);
        })
        .catch(error => {
            console.error(`トークン ${token} でエラーが発生しました:`, error);
        });
    });
}
