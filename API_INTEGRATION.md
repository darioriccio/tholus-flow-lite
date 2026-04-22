# API Integration Note

This note documents the firmware assumptions used by Tholus Flow Lite.

## HTTP Routes

### `GET /api/status`

Expected to return device identity and capabilities.

Important fields used by the app:

- `mac`
- `protocol_version`
- `device_id`
- `fw_version`
- `paired`
- `auth_required`
- `ip`
- `ws_port`
- `wifi_connected`
- `sensor.ready`
- `cloud.queue_depth`
- `ws.json_v2`
- `tracking.*`

### `GET /api/config`

Protected by bearer token.

Expected wrapper:

```json
{
  "status": "ok",
  "config": {
    "heightThreshold": 1700,
    "roiMask": [1,1,1,1,1,1,1,1],
    "countingLineRow": 3,
    "topToBottomIsIn": true,
    "maxTracks": 4,
    "eventConfidenceMin": 0.6,
    "streamModeDefault": "json_v2"
  }
}
```

### `POST /api/pair`

Expected request:

```json
{
  "setup_code": "AB12CD",
  "client_name": "Front Door"
}
```

Expected response:

```json
{
  "status": "paired",
  "token": "…",
  "device_id": "tholusflow-AB12CD",
  "protocol_version": 2
}
```

### `POST /api/config`

Protected by bearer token.

Expected payload fields used by the app:

- `heightThreshold`
- `roiMask`
- `countingLineRow`
- `topToBottomIsIn`
- `maxTracks`
- `eventConfidenceMin`
- `streamModeDefault`

### `POST /api/restart`

Protected by bearer token.

Expected lightweight acknowledgement:

```json
{
  "status": "ok",
  "restarting": true
}
```

## WebSocket

Expected endpoint:

- `ws://<sensor-host>:81`

The app immediately sends:

```json
{
  "type": "subscribe",
  "mode": "json_v2"
}
```

Expected acknowledgement:

```json
{
  "type": "subscribed",
  "mode": "json_v2",
  "protocol_version": 2
}
```

### Expected Message Shapes

#### `frame`

```json
{
  "type": "frame",
  "seq": 123,
  "matrix": [64 integers],
  "occupancy_estimate": 1,
  "sensor_ready": true
}
```

Note: in the current firmware this value is a live blob estimate near the doorway, not venue occupancy.

#### `tracks`

```json
{
  "type": "tracks",
  "tracks": [
    {
      "id": 2,
      "row": 3.1,
      "col": 4.8,
      "distance_mm": 780,
      "confidence": 0.84,
      "state": "moving_down"
    }
  ]
}
```

#### `count`

```json
{
  "type": "count",
  "event_id": "AB12CD-00000042",
  "direction": "IN",
  "distance_mm": 822,
  "confidence": 0.91
}
```

The app normalizes `IN/OUT` to lowercase `in/out`.

#### `diag`

```json
{
  "type": "diag",
  "wifi_connected": true,
  "cloud_queue_depth": 0,
  "last_error": null
}
```

## Error States The App Expects

- network failure while fetching status or config
- `401` or `403` for missing or invalid bearer token
- sensor reachable but not paired
- sensor paired elsewhere with no local token available
- WebSocket disconnects after the HTTP status probe succeeded
- partial support for legacy CSV frames when `json_v2` is unavailable

## Pairing / Auth Assumptions

- pairing is single-device and returns one bearer token
- protected endpoints require `Authorization: Bearer <token>`
- live status and WebSocket can remain readable even if protected writes are unavailable

## Browser Caveats

Tholus Flow Lite is a browser app. That means the sensor firmware must cooperate with browser networking rules:

- allow cross-origin requests from the app origin
- handle `OPTIONS` preflight for JSON `POST` and `Authorization`
- return `Access-Control-Allow-Origin`
- allow `Content-Type` and `Authorization` headers

If those headers are missing, the browser UI may not be able to read or write the sensor even if the firmware works with desktop or native clients.
