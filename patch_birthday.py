from pathlib import Path

root=Path('/mnt/data/osra_bday_work')
index=root/'index.html'
app=root/'app.js'
css=root/'style.css'
sw=root/'sw.js'

s=index.read_text(encoding='utf-8')
# Replace build marker and script query.
s=s.replace('OsRa v100 — 2026-10-07 — R24 PRESERVED UI + FAST THUMBS + ALL-ALBUM NAME LINK + SCAN CARD HIDE + CACHE HARD FIX',
            'OsRa v100 — 2026-10-07 — R24 STABLE FAST THUMBS + MULTI-ALBUM-SOURCE LINK REVIEW + BIRTHDAY + BIRTHDAY BANNER + DOG')
s=s.replace('''<body>\n<div id="bootSplash"''','''<body>\n<div id="birthday-banner-container" class="birthday-banner" aria-live="polite" aria-label="تهنئة عيد ميلاد رانيا">\n  <div class="birthday-ticker-wrap"><div class="birthday-ticker-content">🎉✨ كل سنة وانتي طيبة ياروحي 🎂🎉♥️🥰🤩 &nbsp;&nbsp;•&nbsp;&nbsp; Happy birthday &nbsp;&nbsp;•&nbsp;&nbsp; 🎉✨ كل سنة وانتي طيبة ياروحي 🎂🎉♥️🥰🤩</div></div>\n</div>\n<div id="birthday-effects" aria-hidden="true"></div>\n<div id="bootSplash"''')
# Add dog modal before main modal; keep existing modal/lightbox untouched.
marker='''<div id="toast" class="toast"></div>\n<dialog id="modal" class="modal">'''
dog='''<div id="toast" class="toast"></div>\n<dialog id="birthday-dog-dialog" class="birthday-dog-dialog" aria-label="تهنئة عيد ميلاد رانيا">\n  <div class="birthday-dog-card">\n    <button id="birthdayDogClose" class="birthday-dog-close" type="button" aria-label="إغلاق">×</button>\n    <div class="birthday-dog-wrap">\n      <svg class="birthday-dog-svg" viewBox="0 0 260 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="كلب أبيض جيرمن مبتسم يحمل لافتة تهنئة">\n        <defs>\n          <filter id="dogShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#5a3949" flood-opacity=".18"/></filter>\n        </defs>\n        <g filter="url(#dogShadow)">\n          <path d="M68 104 37 20 92 61Z" fill="#fff" stroke="#dedede" stroke-width="3"/>\n          <path d="M192 104 223 20 168 61Z" fill="#fff" stroke="#dedede" stroke-width="3"/>\n          <path d="M65 86 48 38 80 68Z" fill="#ffe8ee"/>\n          <path d="M195 86 212 38 180 68Z" fill="#ffe8ee"/>\n          <ellipse cx="130" cy="118" rx="72" ry="60" fill="#fff" stroke="#dedede" stroke-width="3"/>\n          <circle cx="100" cy="111" r="8" fill="#26323a"/><circle cx="101.8" cy="108.5" r="2.8" fill="#fff"/>\n          <circle cx="160" cy="111" r="8" fill="#26323a"/><circle cx="161.8" cy="108.5" r="2.8" fill="#fff"/>\n          <ellipse cx="130" cy="137" rx="27" ry="19" fill="#fafafa"/>\n          <ellipse cx="130" cy="132" rx="14" ry="10" fill="#222"/>\n          <path d="M113 145 Q130 161 147 145" fill="none" stroke="#222" stroke-width="3" stroke-linecap="round"/>\n          <path d="M124 153 Q130 169 136 153 Z" fill="#ff718b"/>\n          <path d="M74 180 Q130 160 186 180 L194 285 Q130 305 66 285Z" fill="#fff" stroke="#dedede" stroke-width="3"/>\n          <path d="M130 179 112 191 130 198 148 191Z" fill="#e53935"/>\n          <ellipse cx="78" cy="220" rx="15" ry="32" fill="#fff" stroke="#dedede" stroke-width="3"/>\n          <g class="birthday-dog-raised-group">\n            <path d="M183 198 Q214 164 205 119" fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round"/>\n            <path d="M183 198 Q214 164 205 119" fill="none" stroke="#dedede" stroke-width="29" stroke-linecap="round" opacity=".65"/>\n            <line x1="205" y1="119" x2="205" y2="76" stroke="#8d6e63" stroke-width="6" stroke-linecap="round"/>\n            <rect x="28" y="28" width="220" height="58" rx="13" fill="#fff7b8" stroke="#f2bf27" stroke-width="3"/>\n            <text x="138" y="52" font-family="Tahoma, Segoe UI, sans-serif" font-size="14" font-weight="800" fill="#c62828" text-anchor="middle" direction="rtl" unicode-bidi="plaintext">كل سنة وانتي طيبة ياحبيبتي</text>\n            <text x="138" y="75" font-size="17" text-anchor="middle">♥️😍🎂❤️🎉</text>\n          </g>\n        </g>\n      </svg>\n    </div>\n  </div>\n</dialog>\n<dialog id="modal" class="modal">'''
if marker not in s:
    raise SystemExit('index marker not found')
s=s.replace(marker,dog,1)
s=s.replace('app.js?v=osra100-20261007-r24-multi-source-review-birthday','app.js?v=osra100-20261007-r24-birthday-banner-dog')
index.write_text(s,encoding='utf-8')

s=app.read_text(encoding='utf-8')
# Replace birthday greeting with dog dialog opener.
old="function birthdayRaniaGreeting(){modal(`<div class=\"birthday-greeting\" style=\"text-align:center;padding:18px 8px\"><div style=\"font-size:56px\">🎂🎉♥️🥰🤩</div><h2 style=\"margin-top:8px\">كل سنة وانتي طيبة ياروحي🎂🎉♥️🥰🤩</h2><p style=\"font-size:22px;margin:8px 0\">Happy birthday</p><div class=\"actions\"><button class=\"btn primary\" data-action=\"closeModal\">♥️</button></div></div>`)}"
new="""function birthdayRaniaGreeting(){\n const d=$('#birthday-dog-dialog');\n if(!d)return;\n if(!isBirthdayRaniaToday()){toast('رسالة عيد الميلاد تظهر في يوم عيد ميلاد رانيا فقط.');return}\n if(!d.open)d.showModal();\n}"""
if old not in s:
    raise SystemExit('birthday greeting function not found')
s=s.replace(old,new,1)
# Insert birthday UI controller after isBirthdayRaniaToday.
anchor="function isBirthdayRaniaToday(){const d=String(state.settings.birthdayRania||'');if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(d))return false;const now=today().slice(5);return d.slice(5)===now}"
insert=r'''\nfunction birthdayUiIsActive(){return isBirthdayRaniaToday()&&!$('#lightbox')?.open}\nlet birthdayEffectsTimer=0,birthdayClockTimer=0;\nfunction stopBirthdayEffects(){\n  clearInterval(birthdayEffectsTimer);birthdayEffectsTimer=0;\n  const c=$('#birthday-effects');if(c)c.replaceChildren();\n}\nfunction spawnBirthdayEffect(){\n  const c=$('#birthday-effects');\n  if(!c||!birthdayUiIsActive())return;\n  const item=document.createElement('span');\n  item.className='birthday-fall-item';\n  const items=['❤️','💖','💕','🌹','🌷','💋','💗','🌸','💐','🥰'];\n  item.textContent=items[Math.floor(Math.random()*items.length)];\n  item.style.left=(2+Math.random()*96)+'vw';\n  item.style.setProperty('--drift',((Math.random()-.5)*20).toFixed(1)+'vw');\n  item.style.fontSize=(16+Math.random()*16).toFixed(0)+'px';\n  item.style.animationDuration=(4.5+Math.random()*3.5).toFixed(2)+'s';\n  item.style.animationDelay=(Math.random()*.8).toFixed(2)+'s';\n  item.addEventListener('animationend',()=>item.remove(),{once:true});\n  c.appendChild(item);\n}\nfunction updateBirthdayUi(){\n  const active=birthdayUiIsActive();\n  const banner=$('#birthday-banner-container'),effects=$('#birthday-effects');\n  document.body.classList.toggle('birthday-day',active);\n  document.body.classList.toggle('birthday-lightbox-open',!!$('#lightbox')?.open);\n  if(banner)banner.hidden=!active;\n  if(effects)effects.hidden=!active;\n  if(active){\n    if(!birthdayEffectsTimer){\n      for(let i=0;i<14;i++)setTimeout(spawnBirthdayEffect,i*140);\n      birthdayEffectsTimer=setInterval(spawnBirthdayEffect,520);\n    }\n  }else stopBirthdayEffects();\n}\nfunction initBirthdayUi(){\n  $('#birthdayDogClose')?.addEventListener('click',()=>$('#birthday-dog-dialog')?.close());\n  $('#birthday-dog-dialog')?.addEventListener('click',e=>{if(e.target.id==='birthday-dog-dialog')e.target.close()});\n  $('#lightbox')?.addEventListener('toggle',()=>{if($('#lightbox')?.open)stopBirthdayEffects();setTimeout(updateBirthdayUi,0)});\n  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')updateBirthdayUi()});\n  updateBirthdayUi();\n  clearInterval(birthdayClockTimer);\n  birthdayClockTimer=setInterval(updateBirthdayUi,60000);\n}\n'''
if anchor not in s:
    raise SystemExit('birthday anchor not found')
s=s.replace(anchor,anchor+insert,1)
# Change home birthday button text.
s=s.replace("<button class=\"btn primary\" data-action=\"birthdayRania\">🎂 اليوم عيد ميلاد رانيا 🎉</button>","<button class=\"btn primary birthday-home-button\" data-action=\"birthdayRania\">🎂 عيد ميلاد رانيا اليوم — اضغطي هنا 🎉</button>")
# Initialize birthday UI after render/update sound. Ensure only once at boot.
oldboot="(async()=>{try{ensureLatestOsRa().catch(()=>{});await dbOpen();await load();renderNoAnim();updateSoundButton();hideBootSplash();"
newboot="(async()=>{try{ensureLatestOsRa().catch(()=>{});await dbOpen();await load();renderNoAnim();updateSoundButton();initBirthdayUi();hideBootSplash();"
if oldboot not in s:
    raise SystemExit('boot anchor not found')
s=s.replace(oldboot,newboot,1)
app.write_text(s,encoding='utf-8')

# CSS append.
css_s=css.read_text(encoding='utf-8')
css_append=r'''

/* R24 birthday day layer: active only on Rania's birthday, hidden in the full-screen photo viewer. */
.birthday-banner{position:fixed;top:0;left:0;right:0;height:44px;z-index:200;background:linear-gradient(90deg,#b71c1c,#e53935 48%,#b71c1c);color:#fff;display:block;border-bottom:2px solid rgba(255,255,255,.22);box-shadow:0 3px 14px rgba(80,15,20,.28);overflow:hidden;direction:ltr;pointer-events:none}
.birthday-banner[hidden],#birthday-effects[hidden]{display:none!important}
.birthday-ticker-wrap{width:100%;height:44px;overflow:hidden;white-space:nowrap}
.birthday-ticker-content{display:inline-block;min-width:max-content;padding-inline:8vw;font-size:15px;font-weight:800;line-height:44px;animation:birthdayTicker 20s linear infinite}
@keyframes birthdayTicker{0%{transform:translate3d(100vw,0,0)}100%{transform:translate3d(-100%,0,0)}}
#birthday-effects{position:fixed;top:44px;right:0;bottom:0;left:0;z-index:198;overflow:hidden;pointer-events:none}
.birthday-fall-item{position:absolute;top:-42px;opacity:0;filter:drop-shadow(0 3px 5px rgba(95,25,45,.16));animation:birthdayFall 6s linear forwards;will-change:transform,opacity;user-select:none}
@keyframes birthdayFall{0%{opacity:0;transform:translate3d(0,-30px,0) rotate(-8deg) scale(.8)}10%{opacity:.96}88%{opacity:.86}100%{opacity:0;transform:translate3d(var(--drift),calc(100vh + 80px),0) rotate(360deg) scale(1.08)}}
body.birthday-day .topbar{padding-top:54px}
body.birthday-lightbox-open .birthday-banner,body.birthday-lightbox-open #birthday-effects{display:none!important}
.birthday-home-button{animation:birthdayHomePulse 2s ease-in-out infinite;box-shadow:0 6px 20px rgba(211,47,47,.22)}
@keyframes birthdayHomePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
.birthday-dog-dialog{width:min(410px,calc(100% - 22px));max-width:410px;border:0;border-radius:26px;padding:0;background:transparent;overflow:visible}
.birthday-dog-dialog::backdrop{background:rgba(25,10,18,.62);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.birthday-dog-card{position:relative;background:linear-gradient(180deg,#fffdf9,#fff4ea);border:1px solid rgba(108,70,100,.18);border-radius:26px;padding:22px 14px 8px;box-shadow:0 24px 60px rgba(42,20,34,.3);overflow:hidden}
.birthday-dog-card::after{content:'♥  🌹  💕  💋  🌸  ❤️  💐';display:block;text-align:center;font-size:20px;letter-spacing:5px;padding:0 0 7px;animation:birthdaySparkle 1.8s ease-in-out infinite}
@keyframes birthdaySparkle{0%,100%{opacity:.6;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}
.birthday-dog-close{position:absolute;top:10px;left:10px;width:34px;height:34px;border:0;border-radius:50%;background:#f0e7e1;color:#5c4b55;font-size:24px;line-height:1;z-index:4}
.birthday-dog-wrap{display:grid;place-items:center;height:385px}
.birthday-dog-svg{width:min(100%,330px);height:100%;overflow:visible}
.birthday-dog-raised-group{transform-origin:183px 198px;animation:birthdayDogWave 2.5s ease-in-out infinite}
@keyframes birthdayDogWave{0%,100%{transform:rotate(0)}50%{transform:rotate(-5deg)}}
@media(max-width:560px){body.birthday-day .topbar{padding-top:52px}.birthday-ticker-content{font-size:14px}.birthday-dog-wrap{height:350px}.birthday-dog-svg{width:310px}}
@media(prefers-reduced-motion:reduce){.birthday-ticker-content,.birthday-fall-item,.birthday-home-button,.birthday-dog-raised-group,.birthday-dog-card::after{animation:none!important}.birthday-fall-item{display:none!important}}
'''
css.write_text(css_s+css_append,encoding='utf-8')

sw_s=sw.read_text(encoding='utf-8')
sw_s=sw_s.replace("const BUILD='osra100-20261007-r24-multi-source-review-birthday';","const BUILD='osra100-20261007-r24-birthday-banner-dog';")
sw_s=sw_s.replace("./app.js?v=osra100-20261007-r24-multi-source-review-birthday","./app.js?v=osra100-20261007-r24-birthday-banner-dog")
sw_s=sw_s.replace("./app.js?v=osra100-20261007-r24-fastthumbs-stable","./app.js?v=osra100-20261007-r24-birthday-banner-dog")
sw.write_text(sw_s,encoding='utf-8')

print('patched')
