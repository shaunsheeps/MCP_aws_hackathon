#!/usr/bin/env python3
import os
import sys
import time
import argparse
import requests
import json

def invoke_video_generation(api_key: str, prompt: str, model: str) -> str:
    url = "https://api.minimax.chat/v1/video_generation"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {"prompt": prompt, "model": model}

    resp = requests.post(url, headers=headers, json=payload)
    resp.raise_for_status()
    data = resp.json()

    # Debug: show full API response
    print("▶ video_generation response:", file=sys.stderr)
    print(json.dumps(data, indent=2), file=sys.stderr)

    # grab whichever key holds the job ID
    task_id = data.get("task_id") or data.get("id") or data.get("job_id")
    if not task_id:
        print(f"❌ No job key in response: {list(data.keys())}", file=sys.stderr)
        sys.exit(1)

    print(f"✅ Submitted job ID: {task_id}", file=sys.stderr)
    return task_id

def query_video_generation(api_key: str, task_id: str):
    url = f"https://api.minimax.chat/v1/query/video_generation?task_id={task_id}"
    headers = {"Authorization": f"Bearer {api_key}"}

    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    data = resp.json()

    status  = data.get("status", "Unknown")
    file_id = data.get("file_id", "")
    return status, file_id

def fetch_video_result(api_key: str, file_id: str, output: str):
    url = f"https://api.minimax.chat/v1/files/retrieve?file_id={file_id}"
    headers = {"Authorization": f"Bearer {api_key}"}

    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    download_url = resp.json()["file"]["download_url"]

    video = requests.get(download_url)
    video.raise_for_status()
    with open(output, "wb") as f:
        f.write(video.content)
    print(f"🎬 Video saved to {output}", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(description="Generate a standup video via MiniMax")
    parser.add_argument("prompt",      help="Text prompt describing your video")
    parser.add_argument("output",      help="Where to save the MP4 (e.g. video.mp4)")
    parser.add_argument("--model",     default="T2V-01",   help="Which MiniMax model to use")
    parser.add_argument("--poll-interval", type=int, default=10,
                        help="Seconds between status checks")
    args = parser.parse_args()

    # Read the key that your Node bot loaded into the environment
    api_key = os.getenv("MINIMAX_API_KEY")
    print(f"🐍 MINIMAX_API_KEY = {api_key}", file=sys.stderr)
    if not api_key:
        print("❌ MINIMAX_API_KEY not set in environment", file=sys.stderr)
        sys.exit(1)

    # 1) Submit
    task_id = invoke_video_generation(api_key, args.prompt, args.model)

    # 2) Poll
    while True:
        time.sleep(args.poll_interval)
        status, file_id = query_video_generation(api_key, task_id)
        print(f"⏳ Status: {status}", file=sys.stderr)
        if status == "Success":
            fetch_video_result(api_key, file_id, args.output)
            sys.exit(0)
        if status in ("Fail", "Unknown"):
            print(f"❌ Generation failed (status={status})", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()
