import pandas as pd, os
os.chdir('/app/backend/data')
files = {
  'flight_schedule.xlsx':'FLIGHTS',
  'carousel_info.xlsx':'CAROUSELS',
  'staffing.xlsx':'STAFFING',
  'baggage_perf.xlsx':'BAGGAGE_PERF',
  'holidays.xlsx':'HOLIDAYS',
  'process_times.xlsx':'PROCESS_TIMES',
  'baggage_data.xlsx':'BAGGAGE_DATA',
}
for f,label in files.items():
    print('='*70)
    print(label, f)
    try:
        xl = pd.ExcelFile(f)
        for sh in xl.sheet_names:
            df = xl.parse(sh)
            print(f'  SHEET: {sh}  rows={len(df)}  cols={list(df.columns)}')
            with pd.option_context('display.max_columns', None, 'display.width', 200):
                print(df.head(5).to_string())
            print()
    except Exception as e:
        print('ERR', e)
