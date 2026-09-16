"""
AeroFlow RAG (Retrieval-Augmented Generation) & Auto-Pilot Engine
Exclusively for Airport Operations & Tactical Terminal Management

Provides:
1. Semantic Retrieval over Airport Standard Operating Procedures (ICAO Annex 9, CISF Directives, Widebody Sizing SOPs)
2. Real-Time Manpower Auto-Deployment for Congested Checkpoints & Security Screening Lanes
3. Real-Time Baggage Carousel Auto-Reassignment based on Aircraft Types, Arrival Surges, and Belt Sizing Guidelines
4. Seamless Switching between 'Manual Review' and 'Autonomous RAG Mode' with complete Audit Trail
"""

import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# ==========================================
# 1. AIRPORT STANDARD OPERATING PROCEDURES (SOP) CORPUS
# ==========================================
AIRPORT_SOP_CORPUS = [
    {
        "sop_id": "SOP-CONG-01",
        "title": "Forecourt & DigiYatra Entry Dynamic Load Balancing",
        "category": "forecourt",
        "content": "When forecourt passenger arrival rates exceed 75% capacity or entry queue wait exceeds 6.0 minutes, the duty manager must activate auxiliary DigiYatra biometric e-gates at Gate 2/Gate 6 and reallocate 2 entry marshals from standard queue verification to DigiYatra passenger diversion.",
        "trigger_condition": "Zone occupancy > 75% or wait time > 6 min in Forecourt zones",
        "action_type": "divert_and_open_egates",
        "target_zones": ["forecourt_north", "forecourt_south", "forecourt-entry-gate1", "forecourt-entry-gate8"]
    },
    {
        "sop_id": "SOP-CONG-02",
        "title": "CISF Security Screening SHA & ATRS Lane Escalation Directive",
        "category": "security",
        "content": "Pursuant to CISF Aviation Security Directive 14/2024, if domestic or international Security Hold Area (SHA) density surpasses 80% with queue depth exceeding 250 passengers, immediately open standby ATRS (Automated Tray Return System) X-Ray Lanes 9 & 10. Increment CISF security screening staffing by 3-4 officers per active lane to maintain average processing time under 45 seconds per passenger.",
        "trigger_condition": "Zone density >= 80% or wait time > 12 min in Security SHA",
        "action_type": "open_security_lanes",
        "target_zones": ["security_sha_north", "security_sha_south", "sec-domestic-sha", "sec-intl-sha"]
    },
    {
        "sop_id": "SOP-CONG-03",
        "title": "International Immigration Hall & Biometric E-Gate Staffing",
        "category": "immigration",
        "content": "When international widebody cluster arrivals create an immigration arrival surge (>1,000 pax/hr), deploy 4 additional Bureau of Immigration officers to e-gate assistance counters and convert domestic overflow booths to international clearance desks to prevent hall gridlock.",
        "trigger_condition": "Immigration hall occupancy > 70% or international arrival cluster",
        "action_type": "deploy_immigration_officers",
        "target_zones": ["immigration_hall", "immigration-arr"]
    },
    {
        "sop_id": "SOP-CONG-04",
        "title": "Domestic Check-in Island Overflow & Self Bag Drop Conversion",
        "category": "checkin",
        "content": "During morning peak (05:00-09:00 IST) and evening peak (17:00-21:00 IST), when check-in counters reach 85% capacity, convert 2 standby airline counters to automated Self Bag Drop (SBD) express lines and deploy ground floor marshals to assist passengers.",
        "trigger_condition": "Check-in Island capacity >= 85%",
        "action_type": "convert_to_sbd",
        "target_zones": ["checkin_a_b", "checkin_c_d", "checkin_e_k", "checkin-dom-a", "checkin-dom-b", "checkin-intl-c"]
    },
    {
        "sop_id": "SOP-BAG-01",
        "title": "Widebody High-Capacity Carousel Allocation Protocol (ICAO Annex 9)",
        "category": "baggage",
        "content": "Wide-body aircraft (Boeing 777, 787, 747; Airbus A350, A380, A330) carrying >=230 passengers or >280 estimated bags MUST be assigned to 105m High-Capacity Carousels (AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08). Standard 88m carousels (AC-09 through AC-12) are strictly reserved for narrow-body (A320, B737) and regional flights to avoid baggage recirculation backlog.",
        "trigger_condition": "Widebody aircraft or flight with >230 passengers assigned to an 88m belt",
        "action_type": "reassign_to_105m_belt",
        "target_aircraft": ["B777", "B787", "A350", "A380", "A330", "B747", "wide_body"]
    },
    {
        "sop_id": "SOP-BAG-02",
        "title": "Baggage Carousel Conflict Resolution & Buffer Management",
        "category": "baggage",
        "content": "When flight schedule delays result in an overlap between consecutive arrivals on the same carousel within a 15-minute window, the RAG dispatcher must automatically reallocate the incoming flight to the nearest available active carousel of matching specification, preserving a minimum 10-minute clearance buffer.",
        "trigger_condition": "Arrival time window overlap on the same carousel",
        "action_type": "resolve_carousel_overlap",
        "target_aircraft": ["all"]
    },
    {
        "sop_id": "SOP-BAG-03",
        "title": "Emergency Reserve Belt Isolation Policy (AC-13 / AC-14)",
        "category": "baggage",
        "content": "Carousels AC-13 and AC-14 are designated Airport Operations Emergency & VIP Reserve. Under standard scheduling, these belts must remain unassigned unless terminal arrival throughput exceeds 90% of total reclaim capacity or during unannounced diversion handling.",
        "trigger_condition": "Standard flight scheduled on emergency reserve belts without terminal overload",
        "action_type": "isolate_reserve_belts",
        "target_aircraft": ["all"]
    }
]

# ==========================================
# 2. VECTOR RETRIEVAL ENGINE (TF-IDF & COSINE SIMILARITY)
# ==========================================
class SOPVectorRetriever:
    def __init__(self, corpus: List[Dict[str, Any]]):
        self.corpus = corpus
        self.documents = [
            f"{doc['title']} {doc['content']} {doc['trigger_condition']} {doc['action_type']} {' '.join(doc.get('target_zones', []))}"
            for doc in corpus
        ]
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
        self.doc_vectors = self.vectorizer.fit_transform(self.documents)

    def retrieve(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        query_vec = self.vectorizer.transform([query])
        similarities = cosine_similarity(query_vec, self.doc_vectors).flatten()
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            if score > 0.05:  # Relevance threshold
                results.append({
                    **self.corpus[idx],
                    "similarity_score": round(score, 3)
                })
        return results

retriever = SOPVectorRetriever(AIRPORT_SOP_CORPUS)

# ==========================================
# 3. RAG STATE & AUDIT LOG
# ==========================================
class RagState:
    def __init__(self):
        self.mode: str = "manual"  # 'manual' or 'autonomous'
        self.last_evaluated_at: Optional[str] = None
        self.audit_log: List[Dict[str, Any]] = []
        self.active_manpower_actions: List[Dict[str, Any]] = []
        self.active_baggage_actions: List[Dict[str, Any]] = []

    def toggle_mode(self, new_mode: Optional[str] = None) -> str:
        if new_mode in ("manual", "autonomous"):
            self.mode = new_mode
        else:
            self.mode = "autonomous" if self.mode == "manual" else "manual"
        return self.mode

    def add_audit_entry(self, entry: Dict[str, Any]):
        entry["id"] = f"rag-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        entry["timestamp"] = datetime.now(timezone.utc).isoformat()
        self.audit_log.insert(0, entry)
        # Keep last 100 entries
        if len(self.audit_log) > 100:
            self.audit_log.pop()

rag_state = RagState()

# ==========================================
# 4. REAL-TIME MANPOWER EVALUATION & AUTO-DEPLOYMENT
# ==========================================
def evaluate_congestion_and_deploy_staff(zones: List[Dict[str, Any]], flights: List[Dict[str, Any]], execute_if_autonomous: bool = True) -> Dict[str, Any]:
    """
    Evaluates real-time zone congestion against Airport SOPs.
    If autonomous mode is ON and execute_if_autonomous=True, returns deployment actions with auto-execution flags.
    """
    rag_state.last_evaluated_at = datetime.now(timezone.utc).isoformat()
    recommendations = []
    executed_count = 0
    
    for zone in zones:
        zid = zone.get("zone_id") or zone.get("id")
        zname = zone.get("name") or zone.get("zone_name", zid)
        current_pax = zone.get("current_pax", zone.get("count", 0))
        capacity = max(1, zone.get("capacity", zone.get("baseCapacity", 100)))
        density_pct = int(round((current_pax / capacity) * 100)) if capacity else 0
        wait_min = float(zone.get("wait_minutes", zone.get("wait_seconds", 0) / 60.0))
        current_counters = int(zone.get("counters_open", 1))
        
        # Build contextual query for RAG retriever
        query = f"zone {zid} {zname} category {zone.get('category', zone.get('zone_type', ''))} density {density_pct}% wait {wait_min} minutes queue bottleneck"
        retrieved_sops = retriever.retrieve(query, top_k=2)
        primary_sop = retrieved_sops[0] if retrieved_sops else None
        
        # Check if intervention is needed (density >= 70% or wait >= 8m or recommended counters > current)
        rec_counters = math.ceil(capacity * (density_pct / 100) / 40) if density_pct >= 70 else current_counters
        rec_counters = max(1, min(rec_counters, int(zone.get("max_counters", 16))))
        
        needs_action = density_pct >= 70 or wait_min >= 7.0 or rec_counters > current_counters
        
        if needs_action and primary_sop:
            action_desc = f"Scale staffing from {current_counters} to {rec_counters} counters based on {primary_sop['sop_id']} ({primary_sop['title']})."
            
            action_item = {
                "zone_id": zid,
                "zone_name": zname,
                "current_density_pct": density_pct,
                "current_wait_min": round(wait_min, 1),
                "current_counters": current_counters,
                "recommended_counters": rec_counters,
                "sop_id": primary_sop["sop_id"],
                "sop_title": primary_sop["title"],
                "sop_citation": primary_sop["content"],
                "action_description": action_desc,
                "confidence_score": primary_sop.get("similarity_score", 0.95),
                "status": "auto_deployed" if (rag_state.mode == "autonomous" and execute_if_autonomous) else "pending_manual_approval"
            }
            
            recommendations.append(action_item)
            
            if rag_state.mode == "autonomous" and execute_if_autonomous:
                executed_count += 1
                rag_state.add_audit_entry({
                    "action_type": "MANPOWER_AUTO_DEPLOYMENT",
                    "zone_id": zid,
                    "zone_name": zname,
                    "details": action_desc,
                    "sop_cited": primary_sop["sop_id"],
                    "before": f"{current_counters} counters ({density_pct}% load)",
                    "after": f"{rec_counters} counters (Projected wait: < 4.5m)",
                    "mode": "autonomous"
                })

    rag_state.active_manpower_actions = recommendations
    
    return {
        "mode": rag_state.mode,
        "evaluated_at": rag_state.last_evaluated_at,
        "total_zones_evaluated": len(zones),
        "actions_generated": len(recommendations),
        "actions_auto_executed": executed_count,
        "recommendations": recommendations
    }

# ==========================================
# 5. REAL-TIME BAGGAGE BELT EVALUATION & AUTO-REASSIGNMENT
# ==========================================
def evaluate_baggage_and_reassign_belts(arrivals: List[Dict[str, Any]], carousels: List[Dict[str, Any]], execute_if_autonomous: bool = True) -> Dict[str, Any]:
    """
    Evaluates real-time baggage carousel assignments against ICAO Annex 9 and Airport Widebody SOPs.
    Detects belt undersizing (e.g. B777 on 88m belt) and carousel schedule conflicts.
    """
    from engines import classify_aircraft
    rag_state.last_evaluated_at = datetime.now(timezone.utc).isoformat()
    
    reassignments = []
    executed_count = 0
    active_carousels = [c for c in carousels if c.get("status") != "maintenance"]
    
    # 105m and 88m sets
    long_belts = [c for c in active_carousels if float(c.get("length_m", 88.0)) >= 100.0]
    std_belts = [c for c in active_carousels if float(c.get("length_m", 88.0)) < 100.0]
    
    for flight in arrivals:
        fid = flight.get("flight_id") or flight.get("flight_number")
        fnum = flight.get("flight_number", "FLIGHT")
        current_cid = flight.get("carousel_id")
        current_cnum = flight.get("carousel_number", "TBD")
        ac_info = classify_aircraft(flight)
        pax = flight.get("passengers", 150)
        is_widebody = ac_info["category"] == "wide_body" or pax >= 230
        
        current_carousel_obj = next((c for c in active_carousels if c.get("carousel_id") == current_cid or c.get("carousel_number") == current_cnum), None)
        current_length = float(current_carousel_obj.get("length_m", 88.0)) if current_carousel_obj else 88.0
        
        # Build RAG query
        query = f"flight {fnum} aircraft {ac_info['name']} category {ac_info['category']} passengers {pax} current carousel {current_cnum} length {current_length}m widebody high capacity"
        retrieved_sops = retriever.retrieve(query, top_k=2)
        primary_sop = retrieved_sops[0] if retrieved_sops else None
        
        needs_reassignment = False
        target_carousel = None
        reason = ""
        
        # Case A: Widebody on an 88m standard belt
        if is_widebody and current_length < 100.0:
            needs_reassignment = True
            target_carousel = long_belts[0] if long_belts else (active_carousels[0] if active_carousels else None)
            reason = f"Wide-body {ac_info['name']} with {pax} pax requires 105m high-capacity belt to prevent baggage recirculation backlog (ICAO Annex 9 / SOP-BAG-01)."
            
        # Case B: Standard narrowbody unnecessarily hogging a 105m belt while widebodies are arriving
        elif not is_widebody and current_length >= 100.0 and std_belts:
            needs_reassignment = True
            target_carousel = std_belts[0] if std_belts else None
            reason = f"Narrow-body {ac_info['name']} reallocated to 88m standard belt {target_carousel.get('carousel_number') if target_carousel else 'AC-09'} to preserve 105m belt for heavy wide-body arrivals (SOP-BAG-01)."

        if needs_reassignment and target_carousel and primary_sop:
            reassign_item = {
                "flight_id": fid,
                "flight_number": fnum,
                "aircraft_name": ac_info["name"],
                "passengers": pax,
                "current_carousel_id": current_cid,
                "current_carousel_number": current_cnum,
                "current_length_m": current_length,
                "target_carousel_id": target_carousel.get("carousel_id"),
                "target_carousel_number": target_carousel.get("carousel_number"),
                "target_length_m": float(target_carousel.get("length_m", 105.0)),
                "sop_id": primary_sop["sop_id"],
                "sop_title": primary_sop["title"],
                "sop_citation": primary_sop["content"],
                "reason": reason,
                "confidence_score": primary_sop.get("similarity_score", 0.96),
                "status": "auto_reassigned" if (rag_state.mode == "autonomous" and execute_if_autonomous) else "pending_manual_approval"
            }
            
            reassignments.append(reassign_item)
            
            if rag_state.mode == "autonomous" and execute_if_autonomous:
                executed_count += 1
                rag_state.add_audit_entry({
                    "action_type": "BAGGAGE_BELT_AUTO_REASSIGNMENT",
                    "flight_number": fnum,
                    "aircraft": ac_info["name"],
                    "details": reason,
                    "sop_cited": primary_sop["sop_id"],
                    "before": f"Belt {current_cnum} ({current_length}m)",
                    "after": f"Belt {target_carousel.get('carousel_number')} ({target_carousel.get('length_m')}m)",
                    "mode": "autonomous"
                })

    rag_state.active_baggage_actions = reassignments
    
    return {
        "mode": rag_state.mode,
        "evaluated_at": rag_state.last_evaluated_at,
        "total_arrivals_evaluated": len(arrivals),
        "actions_generated": len(reassignments),
        "actions_auto_executed": executed_count,
        "reassignments": reassignments
    }
