#!/usr/bin/env python3
"""
Load test for Maryknoll SchoolQuest.

Scenarios:
  1. checkpoint — 450 students each claim a booth/checkpoint code once
  2. workshop  — 30 concurrent text-to-image requests to the AI worker

Setup:
  node scripts/load-test/setup-students.mjs   # 450 Firebase users + tokens
  node scripts/load-test/setup-venues.mjs     # C01/B01/W01 test venues in Firestore

Run:
  python3 scripts/load-test/load_test.py --scenario all
  python3 scripts/load-test/load_test.py --scenario checkpoint
  python3 scripts/load-test/load_test.py --scenario workshop
"""

from __future__ import annotations

import argparse
import json
import ssl
import statistics
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# ============ CONFIGURATION ============
VERCEL_URL = "https://260629-muiwo.vercel.app"
AI_SERVICE_URL = "https://schoolquest-ai.onrender.com"

# Booth or checkpoint to claim (e.g. B01, C01)
BOOTH_ID = "C01"
BOOTH_CODE = "739"

# Workshop with text-to-image feature (e.g. W01)
WORKSHOP_ID = "W01"
WORKSHOP_PROMPT = "A friendly robot planting a tree in a sunny school garden"

STUDENTS_FILE = Path(__file__).resolve().parent / "students.json"

CHECKPOINT_STUDENT_COUNT = 450
CHECKPOINT_MAX_WORKERS = 100

WORKSHOP_CONCURRENT_USERS = 30
WORKSHOP_MAX_WORKERS = 30
REQUEST_TIMEOUT_SECONDS = 120
# =======================================

try:
    import certifi

    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CONTEXT = ssl.create_default_context()


@dataclass
class RequestResult:
    elapsed: float
    status_code: int | None = None
    data: dict[str, Any] | None = None
    error: str | None = None


@dataclass
class ScenarioSummary:
    name: str
    total_requests: int
    successes: int = 0
    already_claimed: int = 0
    wrong_code: int = 0
    unauthorized: int = 0
    rate_limited: int = 0
    provider_errors: int = 0
    other_errors: int = 0
    response_times: list[float] = field(default_factory=list)
    wall_clock_seconds: float = 0.0

    @property
    def average_response_time(self) -> float:
        if not self.response_times:
            return 0.0
        return statistics.mean(self.response_times)

    @property
    def p95_response_time(self) -> float:
        if not self.response_times:
            return 0.0
        sorted_times = sorted(self.response_times)
        index = max(0, int(len(sorted_times) * 0.95) - 1)
        return sorted_times[index]


def load_students(limit: int | None = None) -> list[dict[str, str]]:
    if not STUDENTS_FILE.exists():
        raise FileNotFoundError(
            f"{STUDENTS_FILE} not found. Run: node scripts/load-test/setup-students.mjs"
        )

    payload = json.loads(STUDENTS_FILE.read_text(encoding="utf-8"))
    students = payload.get("students", [])

    if not students:
        raise ValueError(f"No students found in {STUDENTS_FILE}")

    if limit is not None:
        return students[:limit]

    return students


def post_json(
    url: str,
    payload: dict[str, Any],
    token: str,
    timeout: int = REQUEST_TIMEOUT_SECONDS,
) -> RequestResult:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=body, method="POST")
    request.add_header("Content-Type", "application/json")
    request.add_header("Authorization", f"Bearer {token}")

    start = time.time()

    try:
        with urllib.request.urlopen(request, timeout=timeout, context=SSL_CONTEXT) as response:
            elapsed = time.time() - start
            data = json.loads(response.read().decode("utf-8"))
            return RequestResult(
                elapsed=elapsed,
                status_code=response.status,
                data=data,
            )
    except urllib.error.HTTPError as error:
        elapsed = time.time() - start
        error_body = error.read().decode("utf-8", errors="replace")

        try:
            data = json.loads(error_body)
        except json.JSONDecodeError:
            data = {"error": error_body}

        return RequestResult(
            elapsed=elapsed,
            status_code=error.code,
            data=data,
            error=f"HTTP {error.code}: {error_body}",
        )
    except Exception as error:
        elapsed = time.time() - start
        return RequestResult(elapsed=elapsed, error=str(error))


def send_claim(student: dict[str, str], booth_id: str, code: str, base_url: str) -> RequestResult:
    url = f"{base_url.rstrip('/')}/api/checkpoint/claim"
    return post_json(
        url,
        {
            "studentId": student["studentId"],
            "boothId": booth_id,
            "enteredCode": code,
        },
        student["token"],
    )


def send_text_to_image(
    student: dict[str, str],
    workshop_id: str,
    prompt: str,
    ai_service_url: str,
) -> RequestResult:
    url = f"{ai_service_url.rstrip('/')}/api/ai/text-to-image"
    return post_json(
        url,
        {
            "prompt": prompt,
            "userId": student["studentId"],
            "boothId": workshop_id,
        },
        student["token"],
    )


def classify_claim_result(result: RequestResult, summary: ScenarioSummary) -> None:
    summary.response_times.append(result.elapsed)

    if result.status_code == 429:
        summary.rate_limited += 1
        return

    if result.status_code == 401:
        summary.unauthorized += 1
        return

    if result.error and result.data is None:
        summary.other_errors += 1
        return

    data = result.data or {}

    if data.get("success"):
        summary.successes += 1
        return

    message = str(data.get("error") or data.get("message") or "")

    if "你已領取過" in message or "Already claimed" in message:
        summary.already_claimed += 1
    elif "密碼錯誤" in message or "Wrong code" in message:
        summary.wrong_code += 1
    elif "Too many attempts" in message:
        summary.rate_limited += 1
    elif result.status_code and result.status_code >= 500:
        summary.other_errors += 1
    else:
        summary.other_errors += 1


def classify_workshop_result(result: RequestResult, summary: ScenarioSummary) -> None:
    summary.response_times.append(result.elapsed)

    if result.status_code == 429:
        summary.rate_limited += 1
        return

    if result.status_code == 401:
        summary.unauthorized += 1
        return

    if result.error and result.data is None:
        summary.other_errors += 1
        return

    data = result.data or {}

    if isinstance(data.get("imageUrl"), str) and data["imageUrl"]:
        summary.successes += 1
        return

    message = str(data.get("error") or "")

    if result.status_code == 502 or "generation failed" in message.lower():
        summary.provider_errors += 1
    elif result.status_code == 503:
        summary.other_errors += 1
    else:
        summary.other_errors += 1


def collect_sample_errors(results: list[RequestResult], limit: int = 5) -> list[str]:
    samples: list[str] = []

    for result in results:
        if result.data and result.data.get("success"):
            continue

        if result.data and result.data.get("imageUrl"):
            continue

        message = result.error or str(result.data)
        if message and message not in samples:
            samples.append(message)

        if len(samples) >= limit:
            break

    return samples


def print_summary(summary: ScenarioSummary, sample_errors: list[str] | None = None) -> None:
    print("=" * 60)
    print(summary.name)
    print("=" * 60)
    print(f"Total requests:        {summary.total_requests}")
    print(f"Successes:             {summary.successes}")
    print(f"Already claimed:       {summary.already_claimed}")
    print(f"Wrong code:            {summary.wrong_code}")
    print(f"Unauthorized (401):    {summary.unauthorized}")
    print(f"Rate limited (429):    {summary.rate_limited}")
    print(f"Provider errors (502): {summary.provider_errors}")
    print(f"Other errors:          {summary.other_errors}")
    print(f"Average response time: {summary.average_response_time:.3f}s")
    print(f"P95 response time:     {summary.p95_response_time:.3f}s")
    print(f"Wall clock time:       {summary.wall_clock_seconds:.3f}s")

    if sample_errors:
        print("Sample errors:")
        for sample in sample_errors:
            print(f"  - {sample[:200]}")

    print("=" * 60)
    print()


def run_checkpoint_load_test(
    base_url: str,
    booth_id: str,
    booth_code: str,
    student_count: int,
    max_workers: int,
) -> ScenarioSummary:
    students = load_students(student_count)
    summary = ScenarioSummary(name="Checkpoint / booth claims", total_requests=len(students))

    print(
        f"Sending {len(students)} concurrent claims "
        f"(booth {booth_id}, code {booth_code}) to {base_url}..."
    )
    print(
        "Each student submits once. Per-student rate limit is 5 attempts/minute, "
        "so one claim per student should not trigger 429s.\n"
    )

    started_at = time.time()
    raw_results: list[RequestResult] = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(send_claim, student, booth_id, booth_code, base_url)
            for student in students
        ]

        for future in as_completed(futures):
            result = future.result()
            raw_results.append(result)
            classify_claim_result(result, summary)

    summary.wall_clock_seconds = time.time() - started_at
    print_summary(summary, collect_sample_errors(raw_results))
    return summary


def run_workshop_load_test(
    ai_service_url: str,
    workshop_id: str,
    prompt: str,
    concurrent_users: int,
    max_workers: int,
) -> ScenarioSummary:
    students = load_students(concurrent_users)
    summary = ScenarioSummary(
        name="Workshop text-to-image",
        total_requests=len(students),
    )

    print(
        f"Sending {len(students)} concurrent text-to-image requests "
        f"for workshop {workshop_id} to {ai_service_url}..."
    )
    print(
        "Warning: this calls the real Recraft API and may incur cost. "
        "The AI worker rate limiter allows 5 req/s with burst 10.\n"
    )

    started_at = time.time()
    raw_results: list[RequestResult] = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(send_text_to_image, student, workshop_id, prompt, ai_service_url)
            for student in students
        ]

        for future in as_completed(futures):
            result = future.result()
            raw_results.append(result)
            classify_workshop_result(result, summary)

    summary.wall_clock_seconds = time.time() - started_at
    print_summary(summary, collect_sample_errors(raw_results))
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Maryknoll SchoolQuest load test")
    parser.add_argument(
        "--scenario",
        choices=("checkpoint", "workshop", "all"),
        default="all",
        help="Which load test to run",
    )
    parser.add_argument("--vercel-url", default=VERCEL_URL)
    parser.add_argument("--ai-service-url", default=AI_SERVICE_URL)
    parser.add_argument("--booth-id", default=BOOTH_ID)
    parser.add_argument("--booth-code", default=BOOTH_CODE)
    parser.add_argument("--workshop-id", default=WORKSHOP_ID)
    parser.add_argument("--prompt", default=WORKSHOP_PROMPT)
    parser.add_argument("--checkpoint-students", type=int, default=CHECKPOINT_STUDENT_COUNT)
    parser.add_argument("--checkpoint-workers", type=int, default=CHECKPOINT_MAX_WORKERS)
    parser.add_argument("--workshop-users", type=int, default=WORKSHOP_CONCURRENT_USERS)
    parser.add_argument("--workshop-workers", type=int, default=WORKSHOP_MAX_WORKERS)
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.scenario in ("checkpoint", "all"):
        run_checkpoint_load_test(
            base_url=args.vercel_url,
            booth_id=args.booth_id,
            booth_code=args.booth_code,
            student_count=args.checkpoint_students,
            max_workers=args.checkpoint_workers,
        )

    if args.scenario in ("workshop", "all"):
        run_workshop_load_test(
            ai_service_url=args.ai_service_url,
            workshop_id=args.workshop_id,
            prompt=args.prompt,
            concurrent_users=args.workshop_users,
            max_workers=args.workshop_workers,
        )


if __name__ == "__main__":
    main()
