import pandas as pd, os, json, numpy as np
os.chdir('/app/backend/data')

def dur_to_min(s):
    try:
        h,m,sec = str(s).split(':')
        return int(h)*60+int(m)+int(sec)/60
    except Exception:
        return None

cdf = pd.read_excel('carousel_info.xlsx')
carousels = []
for _,r in cdf.iterrows():
    carousels.append({
        'carousel_number': str(r['Arrival Carousel']),
        'length_m': float(r['Length (in meter)']),
        'speed_mps': float(r['Speed (in meter per second)']),
    })
print('carousels', len(carousels))

retrieval_curve = [
    {'minute_mark':5,'pct_retrieved':15.0},
    {'minute_mark':10,'pct_retrieved':45.0},
    {'minute_mark':15,'pct_retrieved':75.0},
    {'minute_mark':20,'pct_retrieved':87.5},
    {'minute_mark':25,'pct_retrieved':92.0},
    {'minute_mark':30,'pct_retrieved':96.0},
    {'minute_mark':40,'pct_retrieved':99.5},
]

bdf = pd.read_excel('baggage_data.xlsx')
bdf['first_min'] = bdf['Duration Onblock To First Bag'].apply(dur_to_min)
bdf['last_min'] = bdf['Duration Onblock To Last Bag'].apply(dur_to_min)
bag_stats = {}
for cat, g in bdf.groupby('Category'):
    fm = g['first_min'].dropna(); lm = g['last_min'].dropna()
    bag_stats[str(cat)] = {
        'first_p10': round(float(fm.quantile(.10)),1),
        'first_p50': round(float(fm.quantile(.50)),1),
        'first_p90': round(float(fm.quantile(.90)),1),
        'last_p50': round(float(lm.quantile(.50)),1),
        'last_p90': round(float(lm.quantile(.90)),1),
    }
perflight = bdf.groupby('Flight Number').agg(first_med=('first_min','median'), last_med=('last_min','median')).round(1)
perflight_map = {str(k): {'first': (None if pd.isna(v['first_med']) else float(v['first_med'])),
                          'last': (None if pd.isna(v['last_med']) else float(v['last_med']))}
                 for k,v in perflight.to_dict('index').items()}
print('bag_stats', bag_stats)
handlers = sorted([str(x) for x in bdf['Ground Handlers'].dropna().unique().tolist()])
print('handlers', handlers)

fdf = pd.read_excel('flight_schedule.xlsx')
fdf['Date'] = pd.to_datetime(fdf['Date'])
counts = fdf.groupby('Date').size()
best_day = counts.idxmax()
print('best_day', best_day, 'flights', int(counts.max()))
day = fdf[fdf['Date']==best_day].copy()
flights = []
for _,r in day.iterrows():
    fn = str(r['Flight No.'])
    pf = perflight_map.get(fn, {})
    flights.append({
        'flight_number': fn,
        'direction': str(r['Type']).lower(),
        'is_international': str(r['Flight Type']).strip().lower()=='international',
        'time': str(r['Time']),
        'passengers': int(r['Passengers']),
        'luggage_kg': float(r['Luggage (kg)']),
        'endpoint': str(r['Origin/Destination']),
        'bag_first_med': pf.get('first'),
        'bag_last_med': pf.get('last'),
    })
print('day flights', len(flights))

hdf = pd.read_excel('holidays.xlsx')
holidays = []
for _,r in hdf.iterrows():
    holidays.append({'month':str(r['Month']),'date':str(r['Date']),'day':str(r['Day']),'name':str(r['Holiday Name'])})

sdf = pd.read_excel('staffing.xlsx')
staffing = [{'type':str(r['Facility / Staff Type']),'avg':str(r['Average Number']),'notes':str(r['Notes'])} for _,r in sdf.iterrows()]

seed = {
    'carousels': carousels,
    'retrieval_curve': retrieval_curve,
    'bag_stats': bag_stats,
    'ground_handlers': handlers,
    'flights_day': flights,
    'holidays': holidays,
    'staffing': staffing,
    'source_day': str(best_day.date()),
}
with open('/app/backend/seed_data.json','w') as f:
    json.dump(seed, f)
print('WROTE seed_data.json size', round(os.path.getsize('/app/backend/seed_data.json')/1024,1),'KB')
