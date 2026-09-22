"""Five model studies inferred from the Cultural reference photos."""
import numpy as np
from profile_cultural_geometry import Model, sample_model

SKIN=(.65,.51,.44);DARK=(.12,.14,.18);GOLD=(.62,.43,.20);SILVER=(.62,.65,.68)

def sword(m,top,bottom,z=.3):
    u,v=top;x,y=bottom
    m.outline('sword-blade',[(u-.01,v+.11),(u+.01,v+.11),(x+.008,y-.035),(x,y),(x-.008,y-.035)],z,.025,SILVER,.65)
    m.tube('sword-grip',m.p(u,v,z),m.p(u,v+.1,z),.014,DARK,.4)
    m.tube('sword-guard',m.p(u-.045,v+.11,z),m.p(u+.045,v+.11,z),.012,GOLD,.3)

def bass(m,body,neck,tip,z=.25,color=(.72,.73,.66)):
    m.outline('instrument-body',body,z,.11,color,.85,True)
    a=m.p(*neck,z+.057);b=m.p(*tip,z+.057)
    d=b-a;right=np.array([-d[1],d[0],0]);right=right/np.linalg.norm(right)
    vs=[a-right*.029,a+right*.029,b+right*.021,b-right*.021]
    # An actual solid neck joins the body, fretboard, bridge and headstock.
    uv=[(p[0]/m.width+.5,.5-p[1]/m.height) for p in vs]
    m.outline('instrument-neck',uv,z+.025,.09,(.18,.12,.08),.5)
    for i in range(4):
        off=right*((i-1.5)*.012)
        m.tube('string',a+off+[0,0,.012],b+off+[0,0,.012],.0018,SILVER,density=8)
    for t in np.linspace(.1,.96,17):
        p=a+(b-a)*t
        m.tube('fret',p-right*.024+[0,0,.012],p+right*.024+[0,0,.012],.002,SILVER,density=5)
    end=b+d*.10
    m.tube('headstock',b,end,.042,color,.45,r2=.03)
    for t in [.04,.09]:
        p=b+d*t
        m.tube('tuner',p-right*.065,p+right*.065,.008,SILVER,density=4)

def fox_portrait(m):
    m.ell(.52,.245,.105,.080,.15,.11);m.ell(.50,.215,.155,.125,.16,-.015)
    m.ell(.53,.264,.011,.016,.027,.255)
    m.limb((.51,.30,.03),(.51,.39,0),.10)
    m.ell(.49,.51,.23,.19,.20,-.055);m.ell(.51,.74,.18,.14,.16,-.045)
    m.limb((.29,.39,0),(.20,.63,.05),.115,.09);m.limb((.20,.63,.05),(.60,.665,.27),.09,.075)
    m.ell(.70,.65,.09,.043,.075,.28)
    m.limb((.67,.39,-.02),(.91,.335,.06),.10,.085);m.limb((.91,.335,.06),(.74,.29,.22),.085,.075)
    m.ell(.70,.29,.075,.045,.065,.24)
    m.limb((.45,.8,-.02),(.43,1.04,-.08),.13,.11);m.limb((.58,.8,-.02),(.63,1.04,-.09),.12,.10)
    m.fuse('connected-fox-character',(.44,.41,.34))
    m.outline('left-ear',[(.433,.108),(.43,.025),(.46,-.014),(.50,.076)],-.01,.09,(.83,.64,.39),.9,True)
    m.outline('right-ear',[(.54,.088),(.615,.008),(.674,.003),(.614,.105)],-.015,.08,(.83,.64,.39),.9,True)
    m.outline('cape',[(.20,.355),(.34,.35),(.36,.59),(.40,1.10),(.105,1.10),(.14,.62)],-.17,.075,(.065,.18,.37),.75,True)
    m.outline('blade',[(.68,.38),(.72,.38),(.743,.60),(.717,.645),(.687,.59)],.33,.035,SILVER,.85)
    m.outline('ornate-crossguard',[(.49,.374),(.54,.359),(.62,.374),(.687,.348),(.72,.378),(.85,.359),(.922,.382),(.865,.397),(.744,.389),(.709,.438),(.678,.388),(.57,.391)],.355,.05,GOLD,.8)
    m.tube('sword-handle',m.p(.70,.098,.33),m.p(.70,.372,.33),.021,DARK,.7)
    m.tube('scabbard',m.p(.73,.63,.12),m.p(.80,1.08,-.04),.030,DARK,.35)
    m.environment('portrait')

def stage_bassist(m):
    m.ell(.444,.255,.067,.132,.13,.055);m.ell(.425,.245,.09,.17,.16,-.07)
    m.ell(.449,.279,.009,.018,.023,.183)
    m.limb((.44,.35,0),(.45,.46,-.04),.09)
    m.ell(.447,.60,.143,.19,.18,-.07)
    m.limb((.30,.48,-.04),(.24,.76,.05),.10,.075);m.limb((.24,.76,.05),(.28,.89,.30),.073,.052)
    m.ell(.28,.89,.034,.061,.055,.31)
    m.limb((.567,.48,-.035),(.669,.65,.04),.09,.08);m.limb((.669,.65,.04),(.73,.467,.30),.072,.045)
    m.ell(.731,.458,.035,.082,.058,.31)
    m.ell(.434,.82,.125,.105,.20,-.04);m.limb((.47,.82,-.03),(.529,.94,.12),.135,.10)
    m.limb((.39,.84,-.04),(.355,1.1,.035),.12,.10)
    # Long hair joins the skull instead of floating as separate image pieces.
    m.limb((.368,.23,-.05),(.34,.64,-.045),.09,.048);m.limb((.49,.25,-.07),(.465,.60,-.01),.076,.045)
    m.fuse('connected-bassist',(.52,.49,.46))
    body=[(.255,1.07),(.236,.956),(.27,.82),(.359,.776),(.427,.652),(.488,.632),(.452,.746),(.395,.852),(.424,.916),(.466,.92),(.465,.985),(.417,1.08)]
    bass(m,body,(.329,.966),(.817,.345),.29)
    m.box('amplifier',m.p(.90,.72,-.65),[.43,.56,.34],(.17,.13,.16),.5,1.5)
    m.box('amp-head',m.p(.9,.475,-.65),[.43,.12,.26],(.2,.16,.18),.4,1.3)
    m.environment('stage')

def crouching_swordsman(m):
    m.ell(.454,.282,.047,.080,.105,.15);m.ell(.459,.242,.067,.118,.15,.015)
    m.ell(.455,.301,.007,.016,.02,.255)
    m.limb((.46,.35,.03),(.48,.43,-.045),.080)
    m.limb((.485,.405,-.025),(.559,.624,-.13),.15,.17)
    m.limb((.399,.332,-.07),(.325,.29,.065),.080,.065);m.limb((.325,.29,.065),(.26,.145,.19),.065,.050)
    m.ell(.257,.145,.018,.044,.05,.21)
    m.limb((.529,.404,-.03),(.558,.63,.08),.081,.075);m.limb((.558,.63,.08),(.494,.863,.28),.065,.043)
    m.ell(.478,.886,.034,.028,.065,.29)
    # Raised knee, grounded boot and folded rear leg form one connected pose.
    m.limb((.554,.626,-.12),(.386,.546,.13),.125,.12);m.limb((.386,.546,.13),(.385,.826,.19),.104,.065)
    m.ell(.371,.888,.052,.034,.12,.23)
    m.limb((.574,.65,-.11),(.587,.84,-.07),.125,.105);m.limb((.587,.84,-.07),(.659,.858,-.29),.095,.075)
    m.ell(.671,.871,.05,.026,.095,-.30)
    m.limb((.494,.28,-.11),(.602,.58,-.27),.104,.095);m.limb((.602,.58,-.27),(.666,.855,-.27),.095,.055)
    m.fuse('connected-crouching-character',(.35,.35,.34))
    sword(m,(.262,.013),(.252,.932),.21)
    for j in range(4):
        m.tube('grounded-finger',m.p(.475+j*.012,.89,.31),m.p(.445+j*.023,.913,.33),.007,SKIN,.6)
    m.environment('corridor',.937)

def studio_instruments(m):
    # Real display blocks at staggered depths, all sitting on the same floor.
    floor=-m.height*.43
    for u,v,w,h,z in [(.322,.722,.152,.361,-.16),(.454,.692,.102,.434,-.37),(.602,.765,.194,.299,-.43)]:
        height=(h+.02)*m.height;m.box('display-plinth',m.p(u,.5,z)+[0,floor+height/2,0],[w*m.width,height,.35],(.64,.65,.62),.18,.6)
    # Foreground bass, diagonal red guitar, horizontal black guitar.
    bass(m,[(.308,.875),(.303,.805),(.334,.719),(.338,.598),(.354,.56),(.372,.646),(.386,.724),(.407,.726),(.412,.699),(.426,.724),(.407,.80),(.417,.872),(.387,.919),(.345,.916)],(.367,.85),(.412,.24),.28)
    bass(m,[(.516,.456),(.489,.425),(.468,.387),(.478,.455),(.503,.486),(.503,.536),(.523,.587),(.555,.619),(.596,.590),(.613,.543),(.604,.486),(.570,.438),(.560,.363),(.540,.342),(.546,.409),(.536,.450)],(.553,.527),(.426,.173),-.08,(.30,.055,.065))
    bass(m,[(.278,.344),(.314,.321),(.338,.361),(.361,.376),(.385,.35),(.400,.354),(.385,.391),(.361,.413),(.36,.48),(.374,.532),(.351,.546),(.329,.52),(.317,.547),(.299,.551),(.28,.487),(.289,.448),(.278,.418)],(.31,.446),(.512,.464),-.40,(.12,.13,.14))
    # Drum shell axis points slightly to the viewer; rims and tension lugs have depth.
    a=m.p(.228,.79,.18);b=m.p(.228,.79,-.10)
    m.tube('snare-drum',a,b,.174,(.46,.47,.44),.6,density=1.8)
    for z in [.185,-.105]:
        centre=m.p(.228,.79,z)
        for t in np.linspace(0,2*np.pi,32,endpoint=False):
            p=centre+np.array([np.cos(t)*.177,np.sin(t)*.177,0]);q=centre+np.array([np.cos(t+.19635)*.177,np.sin(t+.19635)*.177,0])
            m.tube('drum-rim',p,q,.005,SILVER,density=4)
    for t in np.linspace(0,2*np.pi,10,endpoint=False):
        off=np.array([np.cos(t)*.178,np.sin(t)*.178,0]);m.tube('drum-lug',a+off,b+off,.006,SILVER,density=3)
    m.box('keyboard-case',m.p(.667,.814,.34),[.36*m.width,.22*m.height,.12],(.08,.10,.13),.45,1.3)
    for k in range(49):
        u=.493+k*.0068;m.box('white-key',m.p(u,.744,.412),[m.width*.0063,m.height*.094,.025],(.76,.77,.74),0,2.5)
        if k%7 not in [2,6]:m.box('black-key',m.p(u+.0034,.723,.43),[m.width*.0035,m.height*.057,.022],(.08,.09,.10),0,3)
    m.tube('microphone',m.p(.659,.611,-.35),m.p(.659,.522,-.35),.013,DARK,density=4)
    m.tube('microphone-grille',m.p(.659,.52,-.35),m.p(.659,.50,-.35),.022,SILVER,density=4)
    m.environment('studio',.93)

def masked_portrait(m):
    m.ell(.551,.275,.049,.17,.13,.16);m.ell(.56,.222,.073,.232,.17,.01)
    m.limb((.56,.40,.015),(.572,.535,-.08),.09)
    m.ell(.623,.685,.12,.275,.19,-.09)
    m.limb((.655,.523,-.08),(.726,.859,.015),.115,.105);m.limb((.726,.859,.015),(.553,.784,.25),.10,.075)
    m.ell(.5,.783,.040,.066,.075,.29)
    m.limb((.559,.537,-.07),(.511,.686,-.01),.092,.08);m.limb((.511,.686,-.01),(.411,.666,.12),.073,.054)
    m.ell(.403,.658,.039,.055,.058,.15)
    m.limb((.62,.887,-.11),(.628,1.13,-.11),.20,.16)
    m.limb((.503,.16,0),(.518,.50,.03),.052,.029);m.limb((.598,.14,-.045),(.594,.526,.005),.066,.030)
    m.fuse('connected-masked-character',(.32,.33,.35))
    m.outline('ornate-weapon',[(.166,.131),(.20,.174),(.277,.364),(.322,.437),(.389,.451),(.404,.494),(.374,.57),(.36,.719),(.329,.752),(.311,.603),(.316,.545),(.283,.514),(.28,.445),(.229,.344),(.195,.266)],.20,.065,GOLD,.8)
    m.tube('weapon-grip',m.p(.367,.646,.16),m.p(.487,.807,.26),.026,(.3,.23,.16),.5)
    m.environment('portrait')

BUILDERS={2:fox_portrait,3:stage_bassist,4:crouching_swordsman,5:studio_instruments,6:masked_portrait}
def build_model(index,aspect):
    model=Model(aspect);BUILDERS[index](model);return model

def bake_model_scene(index,rgb,count,rng,model_dir=None):
    model=build_model(index,rgb.shape[1]/rgb.shape[0])
    if model_dir:
        model_dir.mkdir(parents=True,exist_ok=True);model.export(model_dir/f'cultural{index}.obj')
    return sample_model(model,rgb,count,rng)
