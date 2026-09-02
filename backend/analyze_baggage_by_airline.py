import asyncio
from dotenv import load_dotenv
load_dotenv()

from database import db, parse_dt
from datetime import datetime

async def analyze_baggage_by_airline():
    print("Analyzing baggage times by airline...")

    predictions = await db.baggage_predictions.find({}, {"_id": 0}).to_list(1000)

    airline_data = {}

    for pred in predictions:
        flight = await db.flights.find_one({"flight_id": pred["flight_id"]}, {"_id": 0})
        if not flight:
            continue

        airline = flight.get("airline_name", "Unknown")
        ata = parse_dt(flight.get("ata") or flight.get("sta"))
        first_time = parse_dt(pred.get("predicted_first_bag_time"))
        last_time = parse_dt(pred.get("predicted_last_bag_time"))

        if not ata or not first_time or not last_time:
            continue

        first_min = (first_time - ata).total_seconds() / 60
        last_min = (last_time - ata).total_seconds() / 60
        bag_count = pred.get("bag_count", 0)

        if airline not in airline_data:
            airline_data[airline] = {
                "first_times": [],
                "last_times": [],
                "bag_counts": [],
                "count": 0
            }

        airline_data[airline]["first_times"].append(first_min)
        airline_data[airline]["last_times"].append(last_min)
        airline_data[airline]["bag_counts"].append(bag_count)
        airline_data[airline]["count"] += 1

    results = []
    for airline, data in airline_data.items():
        avg_first = sum(data["first_times"]) / len(data["first_times"]) if data["first_times"] else 0
        avg_last = sum(data["last_times"]) / len(data["last_times"]) if data["last_times"] else 0
        avg_bags = sum(data["bag_counts"]) / len(data["bag_counts"]) if data["bag_counts"] else 0

        results.append({
            "airline": airline,
            "count": data["count"],
            "avg_first_min": avg_first,
            "avg_last_min": avg_last,
            "avg_bag_count": avg_bags
        })

    results.sort(key=lambda x: x["avg_first_min"])

    print("\nBaggage Performance by Airline (sorted by fastest first bag):")
    print("=" * 80)
    print(f"{'Airline':<30} {'Flights':<10} {'Avg Bags':<12} {'First Bag (min)':<18} {'Last Bag (min)':<18}")
    print("-" * 80)

    for r in results:
        airline = r["airline"]
        count = r["count"]
        avg_bags = round(r["avg_bag_count"], 1)
        avg_first = round(r["avg_first_min"], 1)
        avg_last = round(r["avg_last_min"], 1)
        print(f"{airline:<30} {count:<10} {avg_bags:<12} {avg_first:<18} {avg_last:<18}")

    print("\n" + "=" * 80)

    if results:
        fastest = results[0]
        slowest = results[-1]
        print(f"\nFastest airline: {fastest['airline']} - {round(fastest['avg_first_min'], 1)} min average first bag")
        print(f"Slowest airline: {slowest['airline']} - {round(slowest['avg_first_min'], 1)} min average first bag")
        print(f"Difference: {round(slowest['avg_first_min'] - fastest['avg_first_min'], 1)} minutes")

if __name__ == "__main__":
    asyncio.run(analyze_baggage_by_airline())
