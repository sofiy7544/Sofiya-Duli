import colorsys, json
def hsl(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    H,L,S=colorsys.rgb_to_hls(r,g,b)
    return f"{round(H*360,1):g} {round(S*100,1):g}% {round(L*100,1):g}%"
T={
"light":dict(background="#FAFBFD",surface="#FFFFFF",surface_2="#F3F6F9",foreground="#101728",primary="#006FE5",primary_foreground="#FFFFFF",primary_soft="#EBF4FF",accent="#794FF8",accent_foreground="#FFFFFF",muted="#F2F5F8",muted_foreground="#657286",border="#E3E7EE",input="#E3E7EE",ring="#006FE5",success="#22C55E",warning="#D97706",danger="#DC2626",info="#2563EB",success_text="#178640",warning_text="#B06105",danger_text="#C42222",info_text="#2563EB"),
"dark":dict(background="#0D1017",surface="#151923",surface_2="#1D222D",foreground="#F5F7FA",primary="#429EFF",primary_foreground="#0B111E",primary_soft="#0F3257",accent="#A588FC",accent_foreground="#0B111E",muted="#1F232E",muted_foreground="#AEB8C7",border="#2D323E",input="#2D323E",ring="#429EFF",success="#34D399",warning="#FBBF24",danger="#F87171",info="#60A5FA",success_text="#34D399",warning_text="#FBBF24",danger_text="#F87171",info_text="#60A5FA"),
"sepia":dict(background="#F2EDE3",surface="#F9F6F0",surface_2="#ECE5DA",foreground="#3C2D20",primary="#A6541D",primary_foreground="#FBF8F4",primary_soft="#F0E0D1",accent="#B85227",accent_foreground="#FBF8F4",muted="#E7E0D5",muted_foreground="#72604F",border="#D3C9BB",input="#D3C9BB",ring="#A6541D",success="#4E7D3A",warning="#A86A12",danger="#B3402E",info="#3F6C94",success_text="#4E7D3A",warning_text="#9D6311",danger_text="#B3402E",info_text="#3F6C94"),
"atlas":dict(background="#F5F7FA",surface="#FFFFFF",surface_2="#EEF2F6",foreground="#141B24",primary="#235F91",primary_foreground="#FFFFFF",primary_soft="#E8F1F8",accent="#D0A34A",accent_foreground="#1C2430",muted="#EEF2F6",muted_foreground="#667382",border="#DCE3EA",input="#DCE3EA",ring="#235F91",success="#2F8A5B",warning="#C18A2F",danger="#C94848",info="#347FC4",success_text="#2D8457",warning_text="#986D25",danger_text="#C74040",info_text="#2F72B0"),
"venza":dict(background="#F7F4EC",surface="#FFFEFB",surface_2="#F1EDE3",foreground="#1C211D",primary="#344A39",primary_foreground="#FFFFFF",primary_soft="#E8EEE4",accent="#C6A568",accent_foreground="#252B27",muted="#F1EDE3",muted_foreground="#6A6F6A",border="#E6E1D7",input="#E6E1D7",ring="#66765A",success="#3F7D58",warning="#B9822E",danger="#C44D47",info="#5879A8",success_text="#3F7D58",warning_text="#986B26",danger_text="#C0443E",info_text="#5070A0"),
}
out={k:{n.replace('_','-'):hsl(v) for n,v in d.items()} for k,d in T.items()}
json.dump(out,open('tokens.json','w'),indent=1)

def lum(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    c=[x/12.92 if x<=.03928 else ((x+.055)/1.055)**2.4 for x in c]; return .2126*c[0]+.7152*c[1]+.0722*c[2]
def cr(a,b):
    la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+.05)/(lb+.05)
PAIRS=[("foreground","background"),("foreground","surface"),("foreground","surface_2"),("muted_foreground","background"),("muted_foreground","surface"),
("primary_foreground","primary"),("accent_foreground","accent"),("primary","surface"),("primary","background"),
("success_text","surface"),("warning_text","surface"),("danger_text","surface"),("info_text","surface"),("danger_text","background")]
fail=0
for k,d in T.items():
    for a,b in PAIRS:
        c=cr(d[a],d[b]); flag="OK" if c>=4.5 else "FAIL"; fail+=c<4.5
        if c<4.5 or a in("primary_foreground","danger_text","muted_foreground"): print(f"{k:6s} {a:18s}/{b:10s} {c:5.2f} {flag}")
print("AA FAILS:",fail); assert fail==0
