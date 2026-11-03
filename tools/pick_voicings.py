# Choose one voicing per chord from the two fetched sources, validated by music theory.
import json
uc=json.load(open('test/fixtures/ukulele-chords.com.json'))
ut=json.load(open('test/fixtures/ukuleletricks.com.json'))
OPEN=[7,0,4,9]  # G C E A
PC={'C':0,'Db':1,'D':2,'Eb':3,'E':4,'F':5,'Gb':6,'G':7,'Ab':8,'A':9,'Bb':10,'B':11}
Q={'':[0,4,7],'m':[0,3,7],'7':[0,4,7,10],'maj7':[0,4,7,11],'m7':[0,3,7,10],'sus2':[0,2,7],'sus4':[0,5,7],'dim':[0,3,6],'aug':[0,4,8],'add9':[0,2,4,7]}
UTQ={'':'major','m':'minor','7':'7','maj7':'maj7','m7':'min7','sus4':'sus','dim':'dim','aug':'aug','add9':'add9'}
def parse(code):
    if ',' in code: return [None if c in 'x-' else int(c) for c in code.split(',')]
    return [None if c=='x' else int(c) for c in code]
def valid(root,q,fr):
    if len(fr)!=4: return False
    tones={(PC[root]+i)%12 for i in Q[q]}
    notes={(OPEN[s]+f)%12 for s,f in enumerate(fr) if f is not None}
    req=set(tones)
    if len(Q[q])==4 and q!='add9': req.discard((PC[root]+7)%12)
    return notes<=tones and req<=notes
def cost(fr):
    pressed=[f for f in fr if f]
    return (fr.count(None)>0, max(pressed or [0]), (max(pressed)-min(pressed)) if pressed else 0, len(pressed))
res={};report=[]
for r in PC:
    for q in Q:
        name=r+q
        a=parse(uc[name])
        b=[parse(c) for c in ut.get(('F#' if r=='Gb' else r)+'|'+UTQ[q],[])] if q in UTQ else []
        a_ok=valid(r,q,a)
        b_ok=[v for v in b if valid(r,q,v)]
        cands=([a] if a_ok else [])+b_ok
        choice=None
        if a_ok and None not in a and max(a)<=5: choice=a; why='ukulele-chords.com primary'
        else:
            nox=[c for c in cands if None not in c]
            if nox: choice=min(nox,key=cost); why='lowest-position theory-valid voicing among sources'
        both = a in b
        report.append(dict(chord=name,ukulele_chords_com=uc[name],uc_theory_valid=a_ok,ukuleletricks_variants=len(b),ukuleletricks_valid=len(b_ok),uc_in_ukuleletricks=both,chosen=''.join(map(str,choice)) if choice else None,choice_in_ut=choice in b, choice_is_uc=choice==a,why=why))
        res[name]=choice
json.dump(report,open('test/fixtures/voicing-report.json','w'),indent=1)
for x in report:
    if not(x['choice_is_uc'] and x['uc_in_ukuleletricks']): print(x)
print(sum(1 for x in report if x['uc_theory_valid']),'uc valid of',len(report))
print(sum(1 for x in report if x['choice_in_ut']),'chosen present in ukuleletricks')
print(sum(1 for x in report if x['ukuleletricks_variants']==0),'not in ukuleletricks')
