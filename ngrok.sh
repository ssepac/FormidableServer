ngrok http 3000
curl http://127.0.0.1:4040/api/tunnels | jq -r ".tunnels[0].public_url" | curl -X POST http://192.168.0.24:3000/server/location -H "pass:silent1" -d @-
