# Board Meeting Minutes Intelligence - Complete Data Sources

**Last Updated:** February 2026
**Total Organisations:** 2,368 (676 active + 1,692 Tier 1 expansion)

---

## Executive Summary

| Sector | Count | Primary Platform | API Available | Status |
|--------|-------|------------------|---------------|--------|
| **Current Sources (676)** | | | | |
| Local Councils (England) | 317 | ModernGov (~85-90%) | SOAP API | Active |
| NHS Trusts | 214 | WordPress, Custom | No | Active |
| Integrated Care Boards (ICBs) | 42 | Various | No | Active |
| Fire and Rescue Authorities | 44 | ModernGov, Custom | Partial | Active |
| Police and Crime Commissioners | 37 | Custom | No | Active |
| Combined Authorities | 12 | ModernGov, Custom | No | Active |
| National Park Authorities | 10 | ModernGov, Custom | No | Active |
| **CURRENT TOTAL** | **676** | | | |
| | | | | |
| **Tier 1 Expansion (~1,692)** | | | | |
| Multi-Academy Trusts (MATs) | 1,154 | Various (no standard) | GIAS API | Planned |
| Universities | 165 | Various | No | Planned |
| Further Education Colleges | 228 | Various | No | Planned |
| Healthcare Regulators | 10 | Various | No | Planned |
| Major ALBs (>£5M spend) | 135 | Various | No | Planned |
| | | | | |
| **Tier 2 (Future)** | | | | |
| Housing Associations | 1,353 | Various | No | Oct 2026+ |
| Large Charities (>£1M) | ~2,000 | Various | No | Future |
| | | | | |
| **GRAND TOTAL (Tier 1)** | **~2,368** | | | |

---

## TECHNICAL PLATFORMS

### ModernGov (Civica) - Primary Platform for Councils

**Coverage:** ~85-90% of English councils

**SOAP API Details:**
- Endpoint: `/mgWebService.asmx?WSDL`
- Python Library: `pip install moderngov`
- Key Methods:
  - `GetMeetings` - List all meetings
  - `GetMeeting(meeting_id)` - Get meeting details
  - `GetAttachment(attachment_id)` - Download document
  - `GetCommittees` - List all committees

**URL Patterns:**
- `https://democracy.[council].gov.uk/`
- `https://[council].moderngov.co.uk/`
- `https://moderngov.[council].gov.uk/`

**Example Usage:**
```python
from moderngov import api
moderngov = api.Website('https://barnet.moderngov.co.uk')
committees = moderngov.committee.list()
meetings = moderngov.meeting.list(committee_id=123)
```

### CMIS (Committee Management Information System)

**Coverage:** ~15-20 councils

**URL Pattern:** `cmis.[council].gov.uk` or `[council].cmis.uk.com`

**Users:** Birmingham, Essex, Walsall, Sunderland, Cambridge, Norfolk, Stoke-on-Trent, Hull, Dudley, Cheshire West, Luton, Warrington, Wiltshire, East Suffolk, Rochford

---

## SECTION 1: LOCAL COUNCILS (317 Total)

### 1.1 LONDON BOROUGH COUNCILS (33)

| Council Name | Democracy Portal URL | Platform |
|-------------|---------------------|----------|
| Barking and Dagenham | https://lbbd.moderngov.co.uk/ | ModernGov |
| Barnet | https://barnet.moderngov.co.uk/ | ModernGov |
| Bexley | https://www.bexley.gov.uk/about-council/democracy-and-elections | Custom |
| Brent | https://democracy.brent.gov.uk/ | ModernGov |
| Bromley | https://cds.bromley.gov.uk/ | Jadu |
| Camden | https://democracy.camden.gov.uk/ | ModernGov |
| City of London | https://democracy.cityoflondon.gov.uk/ | ModernGov |
| Croydon | https://democracy.croydon.gov.uk/ | ModernGov |
| Ealing | https://ealing.moderngov.co.uk/ | ModernGov |
| Enfield | https://enfield.moderngov.co.uk/ | ModernGov |
| Greenwich | https://royalgreenwich.gov.uk/committees | Custom |
| Hackney | https://hackney.moderngov.co.uk/ | ModernGov |
| Hammersmith and Fulham | https://democracy.lbhf.gov.uk/ | ModernGov |
| Haringey | https://www.minutes.haringey.gov.uk/ | ModernGov |
| Harrow | https://moderngov.harrow.gov.uk/ | ModernGov |
| Havering | https://democracy.havering.gov.uk/ | ModernGov |
| Hillingdon | https://modgov.hillingdon.gov.uk/ | ModernGov |
| Hounslow | https://democraticservices.hounslow.gov.uk/ | ModernGov |
| Islington | https://islington.moderngov.co.uk/ | ModernGov |
| Kensington and Chelsea | https://www.rbkc.gov.uk/council-councillors-and-democracy/councillors-and-committee-meetings | Custom |
| Kingston upon Thames | https://kingston.moderngov.co.uk/ | ModernGov |
| Lambeth | https://moderngov.lambeth.gov.uk/ | ModernGov |
| Lewisham | https://councilmeetings.lewisham.gov.uk/ | ModernGov |
| Merton | https://democracy.merton.gov.uk/ | ModernGov |
| Newham | https://mgov.newham.gov.uk/ | ModernGov |
| Redbridge | http://moderngov.redbridge.gov.uk/ | ModernGov |
| Richmond upon Thames | https://cabnet.richmond.gov.uk/ | ModernGov |
| Southwark | https://moderngov.southwark.gov.uk/ | ModernGov |
| Sutton | https://moderngov.sutton.gov.uk/ | ModernGov |
| Tower Hamlets | https://democracy.towerhamlets.gov.uk/ | ModernGov |
| Waltham Forest | https://democracy.walthamforest.gov.uk/ | ModernGov |
| Wandsworth | https://democracy.wandsworth.gov.uk/ | ModernGov |
| Westminster | https://westminster.moderngov.co.uk/ | ModernGov |

---

### 1.2 METROPOLITAN BOROUGH COUNCILS (36)

#### Greater Manchester (10)

| Council Name | Democracy Portal URL | Platform |
|-------------|---------------------|----------|
| Bolton | https://bolton.moderngov.co.uk/ | ModernGov |
| Bury | https://councildecisions.bury.gov.uk/ | ModernGov |
| Manchester | https://democracy.manchester.gov.uk/ | ModernGov |
| Oldham | http://committees.oldham.gov.uk/ | ModernGov |
| Rochdale | https://democracy.rochdale.gov.uk/ | ModernGov |
| Salford | https://sccdemocracy.salford.gov.uk/ | ModernGov |
| Stockport | https://democracy.stockport.gov.uk/ | ModernGov |
| Tameside | https://tameside.moderngov.co.uk/ | ModernGov |
| Trafford | https://democratic.trafford.gov.uk/ | ModernGov |
| Wigan | https://wigan.moderngov.co.uk/ | ModernGov |

#### West Midlands (7)

| Council Name | Democracy Portal URL | Platform |
|-------------|---------------------|----------|
| Birmingham | https://birmingham.cmis.uk.com/Birmingham/ | CMIS |
| Coventry | https://democracy.coventry.gov.uk/ | ModernGov |
| Dudley | https://cmis.dudley.gov.uk/ | CMIS |
| Sandwell | https://sandwell.moderngov.co.uk/ | ModernGov |
| Solihull | https://solihull.moderngov.co.uk/ | ModernGov |
| Walsall | https://cmispublic.walsall.gov.uk/cmis/ | CMIS |
| Wolverhampton | https://wolverhampton.moderngov.co.uk/ | ModernGov |

#### West Yorkshire (5)

| Council Name | Democracy Portal URL | Platform |
|-------------|---------------------|----------|
| Bradford | https://bradford.moderngov.co.uk/ | ModernGov |
| Calderdale | https://calderdale.moderngov.co.uk/ | ModernGov |
| Kirklees | https://democracy.kirklees.gov.uk/ | ModernGov |
| Leeds | https://democracy.leeds.gov.uk/ | ModernGov |
| Wakefield | http://mg.wakefield.gov.uk/ | ModernGov |

#### South Yorkshire (4)

| Council Name | Democracy Portal URL | Platform |
|-------------|---------------------|----------|
| Barnsley | https://barnsleymbc.moderngov.co.uk/ | ModernGov |
| Doncaster | https://doncaster.moderngov.co.uk/ | ModernGov |
| Rotherham | https://moderngov.rotherham.gov.uk/ | ModernGov |
| Sheffield | https://democracy.sheffield.gov.uk/ | ModernGov |

#### Merseyside (5)

| Council Name | Democracy Portal URL | Platform |
|-------------|---------------------|----------|
| Knowsley | https://knowsley.moderngov.co.uk/ | ModernGov |
| Liverpool | https://liverpool.gov.uk/council/councillors-and-committees/ | Custom |
| Sefton | https://modgov.sefton.gov.uk/ | ModernGov |
| St Helens | https://sthelens.moderngov.co.uk/ | ModernGov |
| Wirral | https://democracy.wirral.gov.uk/ | ModernGov |

#### Tyne and Wear (5)

| Council Name | Democracy Portal URL | Platform |
|-------------|---------------------|----------|
| Gateshead | https://gateshead.moderngov.co.uk/ | ModernGov |
| Newcastle upon Tyne | https://democracy.newcastle.gov.uk/ | ModernGov |
| North Tyneside | https://democracy.northtyneside.gov.uk/ | ModernGov |
| South Tyneside | https://democracy.southtyneside.gov.uk/ | ModernGov |
| Sunderland | https://committees.sunderland.gov.uk/cmis5/ | CMIS |

---

### 1.3 COUNTY COUNCILS (21)

| Council Name | Democracy Portal URL | Platform |
|-------------|---------------------|----------|
| Cambridgeshire | https://cambridgeshire.cmis.uk.com/ccc_live/ | CMIS |
| Derbyshire | https://democracy.derbyshire.gov.uk/ | ModernGov |
| Devon | https://www.devon.gov.uk/democracy/committee-meetings/ | Custom |
| East Sussex | https://democracy.eastsussex.gov.uk/ | ModernGov |
| Essex | https://cmis.essexcc.gov.uk/essexcmis5/ | CMIS |
| Gloucestershire | https://glostext.gloucestershire.gov.uk/ieDocHome.aspx | ModernGov |
| Hampshire | https://democracy.hants.gov.uk/ | ModernGov |
| Hertfordshire | https://democracy.hertfordshire.gov.uk/ | ModernGov |
| Kent | https://democracy.kent.gov.uk/ | ModernGov |
| Lancashire | https://council.lancashire.gov.uk/ieDocHome.aspx | ModernGov |
| Leicestershire | https://democracy.leics.gov.uk/ | ModernGov |
| Lincolnshire | https://lincolnshire.moderngov.co.uk/ | ModernGov |
| Norfolk | https://norfolkcc.cmis.uk.com/norfolkcc/ | CMIS |
| Northamptonshire | Abolished 2021 - replaced by unitary councils | N/A |
| Nottinghamshire | https://www.nottinghamshire.gov.uk/dms/ | Custom |
| Oxfordshire | https://mycouncil.oxfordshire.gov.uk/ | ModernGov |
| Somerset | Abolished 2023 - replaced by unitary council | N/A |
| Staffordshire | https://moderngov.staffordshire.gov.uk/ | ModernGov |
| Suffolk | https://committeeminutes.suffolkcc.gov.uk/ | Custom |
| Surrey | https://mycouncil.surreycc.gov.uk/ | ModernGov |
| Warwickshire | https://democracy.warwickshire.gov.uk/ | ModernGov |
| West Sussex | https://westsussex.moderngov.co.uk/ | ModernGov |
| Worcestershire | https://worcestershire.moderngov.co.uk/ | ModernGov |

---

### 1.4 UNITARY AUTHORITIES (62)

| Council Name | Region | Democracy Portal URL | Platform |
|-------------|--------|---------------------|----------|
| Bath and North East Somerset | South West | https://democracy.bathnes.gov.uk/ | ModernGov |
| Bedford | East | https://councillorsupport.bedford.gov.uk/ | ModernGov |
| Blackburn with Darwen | North West | https://democracy.blackburn.gov.uk/ | ModernGov |
| Blackpool | North West | https://democracy.blackpool.gov.uk/ | ModernGov |
| Bournemouth, Christchurch and Poole | South West | https://democracy.bcpcouncil.gov.uk/ | ModernGov |
| Bracknell Forest | South East | https://democratic.bracknell-forest.gov.uk/ | ModernGov |
| Brighton and Hove | South East | https://democracy.brighton-hove.gov.uk/ | ModernGov |
| Bristol | South West | https://democracy.bristol.gov.uk/ | ModernGov |
| Buckinghamshire | South East | https://buckinghamshire.moderngov.co.uk/ | ModernGov |
| Central Bedfordshire | East | https://centralbedfordshire.moderngov.co.uk/ | ModernGov |
| Cheshire East | North West | https://moderngov.cheshireeast.gov.uk/ | ModernGov |
| Cheshire West and Chester | North West | https://cmttpublic.cheshirewestandchester.gov.uk/ | CMIS |
| Cornwall | South West | https://democracy.cornwall.gov.uk/ | ModernGov |
| Cumberland | North West | https://cumberland.moderngov.co.uk/ | ModernGov |
| Darlington | North East | https://democracy.darlington.gov.uk/ | ModernGov |
| Derby | East Midlands | https://democracy.derby.gov.uk/ | ModernGov |
| Dorset | South West | https://moderngov.dorsetcouncil.gov.uk/ | ModernGov |
| Durham | North East | https://democracy.durham.gov.uk/ | ModernGov |
| East Riding of Yorkshire | Yorks & Humber | https://democracy.eastriding.gov.uk/ | ModernGov |
| Halton | North West | https://councillors.halton.gov.uk/ | ModernGov |
| Hartlepool | North East | https://democracy.hartlepool.gov.uk/ | ModernGov |
| Herefordshire | West Midlands | https://councillors.herefordshire.gov.uk/ | ModernGov |
| Isle of Wight | South East | https://iow.moderngov.co.uk/ | ModernGov |
| Kingston upon Hull | Yorks & Humber | https://cmis.hullcc.gov.uk/cmis/ | CMIS |
| Leicester | East Midlands | https://cabinet.leicester.gov.uk/ | ModernGov |
| Luton | East | https://democracy.luton.gov.uk/cmis5public/ | CMIS |
| Medway | South East | https://democracy.medway.gov.uk/ | ModernGov |
| Middlesbrough | North East | https://democracy.middlesbrough.gov.uk/ | ModernGov |
| Milton Keynes | South East | https://milton-keynes.moderngov.co.uk/ | ModernGov |
| North East Lincolnshire | Yorks & Humber | https://democracy.nelincs.gov.uk/ | ModernGov |
| North Lincolnshire | Yorks & Humber | https://democracy.northlincs.gov.uk/ | ModernGov |
| North Northamptonshire | East Midlands | https://northnorthants.moderngov.co.uk/ | ModernGov |
| North Somerset | South West | https://democracy.n-somerset.gov.uk/ | ModernGov |
| North Yorkshire | Yorks & Humber | https://edemocracy.northyorks.gov.uk/ | ModernGov |
| Nottingham | East Midlands | https://committee.nottinghamcity.gov.uk/ | ModernGov |
| Peterborough | East | https://democracy.peterborough.gov.uk/ | ModernGov |
| Plymouth | South West | https://democracy.plymouth.gov.uk/ | ModernGov |
| Portsmouth | South East | https://democracy.portsmouth.gov.uk/ | ModernGov |
| Reading | South East | https://democracy.reading.gov.uk/ | ModernGov |
| Redcar and Cleveland | North East | https://democracy.redcar-cleveland.gov.uk/ | ModernGov |
| Rutland | East Midlands | https://rutland.moderngov.co.uk/ | ModernGov |
| Shropshire | West Midlands | https://shropshire.gov.uk/committee-services/ | Custom |
| Slough | South East | https://democracy.slough.gov.uk/ | ModernGov |
| Somerset | South West | https://democracy.somerset.gov.uk/ | ModernGov |
| South Gloucestershire | South West | https://councildecisions.southglos.gov.uk/ | ModernGov |
| Southampton | South East | https://democracy.southampton.gov.uk/ | ModernGov |
| Southend-on-Sea | East | https://democracy.southend.gov.uk/ | ModernGov |
| Stockton-on-Tees | North East | https://democracy.stockton.gov.uk/ | ModernGov |
| Stoke-on-Trent | West Midlands | https://stoke.cmis.uk.com/stoke/ | CMIS |
| Swindon | South West | https://democracy.swindon.gov.uk/ | ModernGov |
| Telford and Wrekin | West Midlands | https://democracy.telford.gov.uk/ | ModernGov |
| Thurrock | East | https://democracy.thurrock.gov.uk/ | ModernGov |
| Torbay | South West | https://www.torbay.gov.uk/council/councillors/committee-meetings/ | ModernGov |
| Warrington | North West | https://cmis.warrington.gov.uk/ | CMIS |
| West Berkshire | South East | https://decisionmaking.westberks.gov.uk/ | ModernGov |
| West Northamptonshire | East Midlands | https://westnorthants.moderngov.co.uk/ | ModernGov |
| Westmorland and Furness | North West | https://westmorlandandfurness.moderngov.co.uk/ | ModernGov |
| Wiltshire | South West | https://cms.wiltshire.gov.uk/ | CMIS |
| Windsor and Maidenhead | South East | https://rbwm.moderngov.co.uk/ | ModernGov |
| Wokingham | South East | https://wokingham.moderngov.co.uk/ | ModernGov |
| York | Yorks & Humber | https://democracy.york.gov.uk/ | ModernGov |

---

### 1.5 DISTRICT COUNCILS (164)

#### District Councils A-C

| Council Name | County | Democracy Portal URL | Platform |
|-------------|--------|---------------------|----------|
| Adur | West Sussex | https://democracy.adur-worthing.gov.uk/ | ModernGov |
| Amber Valley | Derbyshire | https://ambervalley.moderngov.co.uk/ | ModernGov |
| Arun | West Sussex | https://www.arun.gov.uk/democracy/ | ModernGov |
| Ashfield | Nottinghamshire | https://democracy.ashfield.gov.uk/ | ModernGov |
| Ashford | Kent | https://ashford.moderngov.co.uk/ | ModernGov |
| Babergh | Suffolk | https://baberghmidsuffolk.moderngov.co.uk/ | ModernGov |
| Basildon | Essex | https://www.basildon.gov.uk/councillorsmeetings | ModernGov |
| Basingstoke and Deane | Hampshire | https://democracy.basingstoke.gov.uk/ | ModernGov |
| Bassetlaw | Nottinghamshire | https://bassetlaw.moderngov.co.uk/ | ModernGov |
| Blaby | Leicestershire | https://democracy.blaby.gov.uk/ | ModernGov |
| Bolsover | Derbyshire | https://democracy.bolsover.gov.uk/ | ModernGov |
| Boston | Lincolnshire | https://democracy.boston.gov.uk/ | ModernGov |
| Braintree | Essex | https://democracy.braintree.gov.uk/ | ModernGov |
| Breckland | Norfolk | https://democracy.breckland.gov.uk/ | ModernGov |
| Brentwood | Essex | https://brentwood.moderngov.co.uk/ | ModernGov |
| Broadland | Norfolk | https://democracy.southnorfolkandbroadland.gov.uk/ | ModernGov |
| Bromsgrove | Worcestershire | https://bromsgrove.moderngov.co.uk/ | ModernGov |
| Broxbourne | Hertfordshire | https://democracy.broxbourne.gov.uk/ | ModernGov |
| Broxtowe | Nottinghamshire | https://democracy.broxtowe.gov.uk/ | ModernGov |
| Burnley | Lancashire | https://burnley.moderngov.co.uk/ | ModernGov |
| Cambridge | Cambridgeshire | https://democracy.cambridge.gov.uk/ | ModernGov |
| Cannock Chase | Staffordshire | https://democracy.cannockchasedc.gov.uk/ | ModernGov |
| Canterbury | Kent | https://democracy.canterbury.gov.uk/ | ModernGov |
| Castle Point | Essex | https://castlepoint.moderngov.co.uk/ | ModernGov |
| Charnwood | Leicestershire | https://charnwood.moderngov.co.uk/ | ModernGov |
| Chelmsford | Essex | https://democracy.chelmsford.gov.uk/ | ModernGov |
| Cheltenham | Gloucestershire | https://democracy.cheltenham.gov.uk/ | ModernGov |
| Cherwell | Oxfordshire | https://modgov.cherwell.gov.uk/ | ModernGov |
| Chichester | West Sussex | https://democracy.chichester.gov.uk/ | ModernGov |
| Chorley | Lancashire | https://democracy.chorley.gov.uk/ | ModernGov |
| Colchester | Essex | https://democracy.colchester.gov.uk/ | ModernGov |
| Cotswold | Gloucestershire | https://meetings.cotswold.gov.uk/ | ModernGov |
| Craven | North Yorkshire | Absorbed into North Yorkshire Council 2023 | N/A |

#### District Councils D-H

| Council Name | County | Democracy Portal URL | Platform |
|-------------|--------|---------------------|----------|
| Dacorum | Hertfordshire | https://democracy.dacorum.gov.uk/ | ModernGov |
| Dartford | Kent | http://committeedmz.dartford.gov.uk/ | ModernGov |
| Derbyshire Dales | Derbyshire | https://democracy.derbyshiredales.gov.uk/ | ModernGov |
| Dover | Kent | https://moderngov.dover.gov.uk/ | ModernGov |
| East Cambridgeshire | Cambridgeshire | https://democracy.eastcambs.gov.uk/ | ModernGov |
| East Devon | Devon | https://democracy.eastdevon.gov.uk/ | ModernGov |
| East Hampshire | Hampshire | https://democracy.easthants.gov.uk/ | ModernGov |
| East Hertfordshire | Hertfordshire | https://democracy.eastherts.gov.uk/ | ModernGov |
| East Lindsey | Lincolnshire | https://democracy.e-lindsey.gov.uk/ | ModernGov |
| East Staffordshire | Staffordshire | https://democracy.eaststaffsbc.gov.uk/ | ModernGov |
| East Suffolk | Suffolk | https://eastsuffolk.cmis.uk.com/eastsuffolk/ | CMIS |
| Eastbourne | East Sussex | https://democracy.lewes-eastbourne.gov.uk/ | ModernGov |
| Eastleigh | Hampshire | https://meetings.eastleigh.gov.uk/ | ModernGov |
| Elmbridge | Surrey | https://democracy.elmbridge.gov.uk/ | ModernGov |
| Epping Forest | Essex | https://democracy.eppingforestdc.gov.uk/ | ModernGov |
| Epsom and Ewell | Surrey | https://democracy.epsom-ewell.gov.uk/ | ModernGov |
| Erewash | Derbyshire | https://democracy.erewash.gov.uk/ | ModernGov |
| Exeter | Devon | https://exeter.moderngov.co.uk/ | ModernGov |
| Fareham | Hampshire | https://moderngov.fareham.gov.uk/ | ModernGov |
| Fenland | Cambridgeshire | https://democracy.fenland.gov.uk/ | ModernGov |
| Folkestone and Hythe | Kent | https://democracy.folkestone-hythe.gov.uk/ | ModernGov |
| Forest of Dean | Gloucestershire | https://meetings.fdean.gov.uk/ | ModernGov |
| Fylde | Lancashire | https://democracy.fylde.gov.uk/ | ModernGov |
| Gedling | Nottinghamshire | https://democracy.gedling.gov.uk/ | ModernGov |
| Gosport | Hampshire | https://democracy.gosport.gov.uk/ | ModernGov |
| Gravesham | Kent | https://democracy.gravesham.gov.uk/ | ModernGov |
| Great Yarmouth | Norfolk | https://great-yarmouth.moderngov.co.uk/ | ModernGov |
| Guildford | Surrey | https://democracy.guildford.gov.uk/ | ModernGov |
| Harborough | Leicestershire | https://democracy.harborough.gov.uk/ | ModernGov |
| Harlow | Essex | https://democracy.harlow.gov.uk/ | ModernGov |
| Hart | Hampshire | https://democracy.hart.gov.uk/ | ModernGov |
| Hastings | East Sussex | https://hastings.moderngov.co.uk/ | ModernGov |
| Havant | Hampshire | https://democracy.havant.gov.uk/ | ModernGov |
| Hertsmere | Hertfordshire | https://democracy.hertsmere.gov.uk/ | ModernGov |
| High Peak | Derbyshire | https://democracy.highpeak.gov.uk/ | ModernGov |
| Hinckley and Bosworth | Leicestershire | https://democracy.hinckley-bosworth.gov.uk/ | ModernGov |
| Horsham | West Sussex | https://democracy.horsham.gov.uk/ | ModernGov |
| Huntingdonshire | Cambridgeshire | https://democracy.huntingdonshire.gov.uk/ | ModernGov |
| Hyndburn | Lancashire | https://democracy.hyndburnbc.gov.uk/ | ModernGov |

#### District Councils I-N

| Council Name | County | Democracy Portal URL | Platform |
|-------------|--------|---------------------|----------|
| Ipswich | Suffolk | https://democracy.ipswich.gov.uk/ | ModernGov |
| King's Lynn and West Norfolk | Norfolk | https://democracy.west-norfolk.gov.uk/ | ModernGov |
| Lancaster | Lancashire | https://democracy.lancaster.gov.uk/ | ModernGov |
| Lewes | East Sussex | https://democracy.lewes-eastbourne.gov.uk/ | ModernGov |
| Lichfield | Staffordshire | https://democracy.lichfielddc.gov.uk/ | ModernGov |
| Lincoln | Lincolnshire | https://democratic.lincoln.gov.uk/ | ModernGov |
| Maidstone | Kent | https://maidstone.moderngov.co.uk/ | ModernGov |
| Maldon | Essex | https://democracy.maldon.gov.uk/ | ModernGov |
| Malvern Hills | Worcestershire | https://democracy.malvernhills.gov.uk/ | ModernGov |
| Mansfield | Nottinghamshire | https://democracy.mansfield.gov.uk/ | ModernGov |
| Melton | Leicestershire | https://democracy.melton.gov.uk/ | ModernGov |
| Mid Devon | Devon | https://democracy.middevon.gov.uk/ | ModernGov |
| Mid Suffolk | Suffolk | https://baberghmidsuffolk.moderngov.co.uk/ | ModernGov |
| Mid Sussex | West Sussex | https://democracy.midsussex.gov.uk/ | ModernGov |
| Mole Valley | Surrey | https://democracy.molevalley.gov.uk/ | ModernGov |
| New Forest | Hampshire | https://democracy.newforest.gov.uk/ | ModernGov |
| Newark and Sherwood | Nottinghamshire | https://democracy.newark-sherwooddc.gov.uk/ | ModernGov |
| Newcastle-under-Lyme | Staffordshire | https://democracy.newcastle-staffs.gov.uk/ | ModernGov |
| North Devon | Devon | https://democracy.northdevon.gov.uk/ | ModernGov |
| North East Derbyshire | Derbyshire | https://democracy.ne-derbyshire.gov.uk/ | ModernGov |
| North Hertfordshire | Hertfordshire | https://democracy.north-herts.gov.uk/ | ModernGov |
| North Kesteven | Lincolnshire | https://democracy.n-kesteven.gov.uk/ | ModernGov |
| North Norfolk | Norfolk | https://www.north-norfolk.gov.uk/committees/ | Custom |
| North Warwickshire | Warwickshire | https://democracy.northwarks.gov.uk/ | ModernGov |
| North West Leicestershire | Leicestershire | https://democracy.nwleics.gov.uk/ | ModernGov |
| Norwich | Norfolk | https://democracy.norwich.gov.uk/ | ModernGov |
| Nuneaton and Bedworth | Warwickshire | https://democracy.nuneatonandbedworth.gov.uk/ | ModernGov |

#### District Councils O-S

| Council Name | County | Democracy Portal URL | Platform |
|-------------|--------|---------------------|----------|
| Oadby and Wigston | Leicestershire | https://democracy.oadby-wigston.gov.uk/ | ModernGov |
| Oxford | Oxfordshire | https://democracy.oxford.gov.uk/ | ModernGov |
| Pendle | Lancashire | https://democracy.pendle.gov.uk/ | ModernGov |
| Preston | Lancashire | https://democracy.preston.gov.uk/ | ModernGov |
| Redditch | Worcestershire | https://redditch.moderngov.co.uk/ | ModernGov |
| Reigate and Banstead | Surrey | https://democracy.reigate-banstead.gov.uk/ | ModernGov |
| Ribble Valley | Lancashire | https://democracy.ribblevalley.gov.uk/ | ModernGov |
| Rochford | Essex | https://rochford.cmis.uk.com/rochford/ | CMIS |
| Rossendale | Lancashire | https://democracy.rossendale.gov.uk/ | ModernGov |
| Rother | East Sussex | https://democracy.rother.gov.uk/ | ModernGov |
| Rugby | Warwickshire | https://democracy.rugby.gov.uk/ | ModernGov |
| Runnymede | Surrey | https://democracy.runnymede.gov.uk/ | ModernGov |
| Rushcliffe | Nottinghamshire | https://democracy.rushcliffe.gov.uk/ | ModernGov |
| Rushmoor | Hampshire | https://democracy.rushmoor.gov.uk/ | ModernGov |
| Ryedale | North Yorkshire | Absorbed into North Yorkshire Council 2023 | N/A |
| Scarborough | North Yorkshire | Absorbed into North Yorkshire Council 2023 | N/A |
| Sedgemoor | Somerset | Absorbed into Somerset Council 2023 | N/A |
| Selby | North Yorkshire | Absorbed into North Yorkshire Council 2023 | N/A |
| Sevenoaks | Kent | https://democracy.sevenoaks.gov.uk/ | ModernGov |
| South Cambridgeshire | Cambridgeshire | https://scambs.moderngov.co.uk/ | ModernGov |
| South Derbyshire | Derbyshire | https://democracy.southderbyshire.gov.uk/ | ModernGov |
| South Hams | Devon | https://democracy.swdevon.gov.uk/ | ModernGov |
| South Holland | Lincolnshire | https://democracy.sholland.gov.uk/ | ModernGov |
| South Kesteven | Lincolnshire | https://democracy.southkesteven.gov.uk/ | ModernGov |
| South Norfolk | Norfolk | https://democracy.southnorfolkandbroadland.gov.uk/ | ModernGov |
| South Oxfordshire | Oxfordshire | https://democracy.southoxon.gov.uk/ | ModernGov |
| South Ribble | Lancashire | https://democracy.southribble.gov.uk/ | ModernGov |
| South Somerset | Somerset | Absorbed into Somerset Council 2023 | N/A |
| South Staffordshire | Staffordshire | https://democracy.sstaffs.gov.uk/ | ModernGov |
| Spelthorne | Surrey | https://democracy.spelthorne.gov.uk/ | ModernGov |
| St Albans | Hertfordshire | https://democracy.stalbans.gov.uk/ | ModernGov |
| Stafford | Staffordshire | https://democracy.staffordbc.gov.uk/ | ModernGov |
| Staffordshire Moorlands | Staffordshire | https://democracy.staffsmoorlands.gov.uk/ | ModernGov |
| Stevenage | Hertfordshire | https://democracy.stevenage.gov.uk/ | ModernGov |
| Stratford-on-Avon | Warwickshire | https://democracy.stratford.gov.uk/ | ModernGov |
| Stroud | Gloucestershire | https://democracy.stroud.gov.uk/ | ModernGov |
| Surrey Heath | Surrey | https://democracy.surreyheath.gov.uk/ | ModernGov |
| Swale | Kent | https://democracy.swale.gov.uk/ | ModernGov |

#### District Councils T-Z

| Council Name | County | Democracy Portal URL | Platform |
|-------------|--------|---------------------|----------|
| Tamworth | Staffordshire | https://democracy.tamworth.gov.uk/ | ModernGov |
| Tandridge | Surrey | https://democracy.tandridge.gov.uk/ | ModernGov |
| Teignbridge | Devon | https://democracy.teignbridge.gov.uk/ | ModernGov |
| Tendring | Essex | https://democracy.tendringdc.gov.uk/ | ModernGov |
| Test Valley | Hampshire | https://democracy.testvalley.gov.uk/ | ModernGov |
| Tewkesbury | Gloucestershire | https://democracy.tewkesbury.gov.uk/ | ModernGov |
| Thanet | Kent | https://democracy.thanet.gov.uk/ | ModernGov |
| Three Rivers | Hertfordshire | https://democracy.threerivers.gov.uk/ | ModernGov |
| Tonbridge and Malling | Kent | https://democracy.tmbc.gov.uk/ | ModernGov |
| Torridge | Devon | https://democracy.torridge.gov.uk/ | ModernGov |
| Tunbridge Wells | Kent | https://democracy.tunbridgewells.gov.uk/ | ModernGov |
| Uttlesford | Essex | https://uttlesford.moderngov.co.uk/ | ModernGov |
| Vale of White Horse | Oxfordshire | https://democracy.whitehorsedc.gov.uk/ | ModernGov |
| Warwick | Warwickshire | https://democracy.warwickdc.gov.uk/ | ModernGov |
| Watford | Hertfordshire | https://democracy.watford.gov.uk/ | ModernGov |
| Waverley | Surrey | https://democracy.waverley.gov.uk/ | ModernGov |
| Wealden | East Sussex | https://democracy.wealden.gov.uk/ | ModernGov |
| Welwyn Hatfield | Hertfordshire | https://democracy.welhat.gov.uk/ | ModernGov |
| West Devon | Devon | https://democracy.swdevon.gov.uk/ | ModernGov |
| West Lancashire | Lancashire | https://democracy.westlancs.gov.uk/ | ModernGov |
| West Lindsey | Lincolnshire | https://democracy.west-lindsey.gov.uk/ | ModernGov |
| West Oxfordshire | Oxfordshire | https://democracy.westoxon.gov.uk/ | ModernGov |
| West Suffolk | Suffolk | https://democracy.westsuffolk.gov.uk/ | ModernGov |
| Winchester | Hampshire | https://democracy.winchester.gov.uk/ | ModernGov |
| Woking | Surrey | https://moderngov.woking.gov.uk/ | ModernGov |
| Worthing | West Sussex | https://democracy.adur-worthing.gov.uk/ | ModernGov |
| Wychavon | Worcestershire | https://democracy.wychavon.gov.uk/ | ModernGov |
| Wyre | Lancashire | https://democracy.wyre.gov.uk/ | ModernGov |
| Wyre Forest | Worcestershire | https://democracy.wyreforestdc.gov.uk/ | ModernGov |

---

### 1.6 SUI GENERIS AUTHORITIES (2)

| Council Name | Democracy Portal URL | Platform |
|-------------|---------------------|----------|
| City of London Corporation | https://democracy.cityoflondon.gov.uk/ | ModernGov |
| Council of the Isles of Scilly | https://www.scilly.gov.uk/council-meetings | Custom |

---

### 1.7 COUNCIL SUMMARY BY TYPE

| Category | Count |
|----------|-------|
| London Boroughs | 33 |
| Metropolitan Boroughs | 36 |
| County Councils | 21 |
| Unitary Authorities | 62 |
| District Councils | 164 |
| Sui Generis | 2 |
| **TOTAL** | **317** |

---

## SECTION 2: NHS TRUSTS (214 Total)

### 2.1 AMBULANCE TRUSTS (10)

| Trust Name | Region | Board Papers URL |
|------------|--------|------------------|
| East Midlands Ambulance Service NHS Trust | Midlands | https://www.emas.nhs.uk/about-us/trust-board/ |
| East of England Ambulance Service NHS Trust | East of England | https://www.eastamb.nhs.uk/about-us/trust-board/public-board-meetings-and-papers |
| London Ambulance Service NHS Trust | London | https://www.londonambulance.nhs.uk/about-us/how-we-are-run/trust-board/ |
| North East Ambulance Service NHS Foundation Trust | North East & Yorkshire | https://www.neas.nhs.uk/about-us/trust-board.aspx |
| North West Ambulance Service NHS Trust | North West | https://www.nwas.nhs.uk/about/trust-board/ |
| South Central Ambulance Service NHS Foundation Trust | South East | https://www.scas.nhs.uk/about-us/trust-board/ |
| South East Coast Ambulance Service NHS Foundation Trust | South East | https://www.secamb.nhs.uk/about-us/our-board/ |
| South Western Ambulance Service NHS Foundation Trust | South West | https://www.swast.nhs.uk/about-us/board-papers |
| West Midlands Ambulance Service University NHS Foundation Trust | Midlands | https://www.wmas.nhs.uk/about-us/trust-board/ |
| Yorkshire Ambulance Service NHS Trust | North East & Yorkshire | https://www.yas.nhs.uk/about-us/our-board/ |

---

### 2.2 ACUTE HOSPITAL TRUSTS - LONDON REGION (20)

| Trust Name | ICS | Board Papers URL |
|------------|-----|------------------|
| Barts Health NHS Trust | North East London | https://www.bartshealth.nhs.uk/board-meetings |
| Chelsea and Westminster Hospital NHS Foundation Trust | North West London | https://www.chelwest.nhs.uk/about-us/trust-board |
| Croydon Health Services NHS Trust | South West London | https://www.croydonhealthservices.nhs.uk/about-us/trust-board/ |
| Epsom and St Helier University Hospitals NHS Trust | South West London | https://www.epsom-sthelier.nhs.uk/trust-board |
| Great Ormond Street Hospital for Children NHS Foundation Trust | North Central London | https://www.gosh.nhs.uk/about-us/who-we-are/organisational-structure/trust-board/ |
| Guy's and St Thomas' NHS Foundation Trust | South East London | https://www.guysandstthomas.nhs.uk/about-us/our-board/agenda-and-papers |
| Homerton Healthcare NHS Foundation Trust | North East London | https://www.homerton.nhs.uk/trust-board |
| Imperial College Healthcare NHS Trust | North West London | https://www.imperial.nhs.uk/about-us/board-papers |
| King's College Hospital NHS Foundation Trust | South East London | https://www.kch.nhs.uk/about/how-we-are-organised/board-of-directors/minutes-and-agendas/ |
| Kingston and Richmond NHS Foundation Trust | South West London | https://www.kingstonhospital.nhs.uk/trust-board/ |
| Lewisham and Greenwich NHS Trust | South East London | https://www.lewishamandgreenwich.nhs.uk/trust-board |
| London North West University Healthcare NHS Trust | North West London | https://www.lnwh.nhs.uk/about-us/trust-board |
| Moorfields Eye Hospital NHS Foundation Trust | London | https://www.moorfields.nhs.uk/content/board-meetings |
| North Middlesex University Hospital NHS Trust | North Central London | https://www.northmid.nhs.uk/trust-board |
| Royal Free London NHS Foundation Trust | North Central London | https://www.royalfree.nhs.uk/about-us/trust-board/trust-board-meetings |
| St George's University Hospitals NHS Foundation Trust | South West London | https://www.stgeorges.nhs.uk/about/trust-board/ |
| The Hillingdon Hospitals NHS Foundation Trust | North West London | https://www.thh.nhs.uk/about-us/trust-board/ |
| University College London Hospitals NHS Foundation Trust | North Central London | https://www.uclh.nhs.uk/about-us/who-we-are/board-directors/board-meetings-and-papers |
| Whittington Health NHS Trust | North Central London | https://www.whittington.nhs.uk/default.asp?c=20208 |
| The Royal Marsden NHS Foundation Trust | London | https://www.royalmarsden.nhs.uk/about-royal-marsden/who-we-are/trust-board |

---

### 2.3 ACUTE HOSPITAL TRUSTS - SOUTH EAST REGION (18)

| Trust Name | ICS | Board Papers URL |
|------------|-----|------------------|
| Ashford and St Peter's Hospitals NHS Foundation Trust | Surrey Heartlands | https://www.ashfordstpeters.nhs.uk/trust-board |
| Buckinghamshire Healthcare NHS Trust | BOB | https://www.buckshealthcare.nhs.uk/about-us/trust-board/ |
| Dartford and Gravesham NHS Trust | Kent and Medway | https://www.dgt.nhs.uk/about-us/trust-board/ |
| East Kent Hospitals University NHS Foundation Trust | Kent and Medway | https://www.ekhuft.nhs.uk/patients-and-visitors/about-us/trust-board/ |
| East Sussex Healthcare NHS Trust | Sussex | https://www.esht.nhs.uk/about-us/trust-board/ |
| Frimley Health NHS Foundation Trust | Frimley | https://www.frimleyhealth.nhs.uk/about-us/trust-board |
| Hampshire Hospitals NHS Foundation Trust | Hampshire and IoW | https://www.hampshirehospitals.nhs.uk/about-us/trust-board |
| Isle of Wight NHS Trust | Hampshire and IoW | https://www.iow.nhs.uk/about-us/trust-board.htm |
| Maidstone and Tunbridge Wells NHS Trust | Kent and Medway | https://www.mtw.nhs.uk/about-us/trust-board/ |
| Medway NHS Foundation Trust | Kent and Medway | https://www.medway.nhs.uk/about-us/trust-board.htm |
| Oxford University Hospitals NHS Foundation Trust | BOB | https://www.ouh.nhs.uk/about/trust-board/meetings-and-papers/ |
| Portsmouth Hospitals University NHS Trust | Hampshire and IoW | https://www.porthosp.nhs.uk/about-us/trust-board.htm |
| Queen Victoria Hospital NHS Foundation Trust | Sussex | https://www.qvh.nhs.uk/about-us/trust-board/ |
| Royal Berkshire NHS Foundation Trust | BOB | https://www.royalberkshire.nhs.uk/about-us/trust-board/ |
| Royal Surrey NHS Foundation Trust | Surrey Heartlands | https://www.royalsurrey.nhs.uk/about-us/trust-board |
| Surrey and Sussex Healthcare NHS Trust | Surrey Heartlands | https://www.surreyandsussex.nhs.uk/about-us/trust-board |
| University Hospital Southampton NHS Foundation Trust | Hampshire and IoW | https://www.uhs.nhs.uk/about-uhs/trust-board |
| University Hospitals Sussex NHS Foundation Trust | Sussex | https://www.uhsussex.nhs.uk/about-us/trust-board/ |

---

### 2.4 ACUTE HOSPITAL TRUSTS - SOUTH WEST REGION (16)

| Trust Name | ICS | Board Papers URL |
|------------|-----|------------------|
| Cornwall Partnership NHS Foundation Trust | Cornwall and IoS | https://www.cornwallft.nhs.uk/about-us/trust-board |
| Devon Partnership NHS Trust | Devon | https://www.dpt.nhs.uk/about-us/trust-board |
| Dorset County Hospital NHS Foundation Trust | Dorset | https://www.dchft.nhs.uk/about-us/trust-board/ |
| Gloucestershire Hospitals NHS Foundation Trust | Gloucestershire | https://www.gloshospitals.nhs.uk/about-us/trust-board/ |
| Great Western Hospitals NHS Foundation Trust | BSW | https://www.gwh.nhs.uk/about-us/trust-board/ |
| North Bristol NHS Trust | BNSSG | https://www.nbt.nhs.uk/about-us/trust-board |
| Northern Devon Healthcare NHS Trust | Devon | https://www.northdevonhealth.nhs.uk/about/board-of-directors/ |
| Royal Cornwall Hospitals NHS Trust | Cornwall and IoS | https://www.royalcornwall.nhs.uk/about-us/trust-board/ |
| Royal Devon University Healthcare NHS Foundation Trust | Devon | https://www.royaldevon.nhs.uk/about-us/trust-board/ |
| Royal United Hospitals Bath NHS Foundation Trust | BSW | https://www.ruh.nhs.uk/about/trust_board/ |
| Salisbury NHS Foundation Trust | BSW | https://www.salisbury.nhs.uk/about-us/trust-board/ |
| Somerset NHS Foundation Trust | Somerset | https://www.somersetft.nhs.uk/about-us/trust-board/ |
| Torbay and South Devon NHS Foundation Trust | Devon | https://www.torbayandsouthdevon.nhs.uk/about-us/trust-board/ |
| University Hospitals Bristol and Weston NHS Foundation Trust | BNSSG | https://www.uhbw.nhs.uk/about-us/trust-board |
| University Hospitals Dorset NHS Foundation Trust | Dorset | https://www.uhd.nhs.uk/about-us/trust-board |
| University Hospitals Plymouth NHS Trust | Devon | https://www.plymouthhospitals.nhs.uk/trust-board-meetings-and-papers/ |

---

### 2.5 ACUTE HOSPITAL TRUSTS - MIDLANDS REGION (23)

| Trust Name | ICS | Board Papers URL |
|------------|-----|------------------|
| Birmingham Women's and Children's NHS Foundation Trust | Birmingham and Solihull | https://bwc.nhs.uk/trust-board |
| Chesterfield Royal Hospital NHS Foundation Trust | Derbyshire | https://www.chesterfieldroyal.nhs.uk/about-us/trust-board |
| George Eliot Hospital NHS Trust | Coventry and Warwickshire | https://www.geh.nhs.uk/about-us/trust-board |
| Kettering General Hospital NHS Foundation Trust | Northamptonshire | https://www.kgh.nhs.uk/about-us/trust-board |
| Northampton General Hospital NHS Trust | Northamptonshire | https://www.northamptongeneral.nhs.uk/About-us/Trust-Board.aspx |
| Nottingham University Hospitals NHS Trust | Nottingham and Nottinghamshire | https://www.nuh.nhs.uk/trust-board |
| Royal Orthopaedic Hospital NHS Foundation Trust | Birmingham and Solihull | https://www.roh.nhs.uk/about-us/trust-board |
| Sandwell and West Birmingham Hospitals NHS Trust | Black Country | https://www.swbh.nhs.uk/about-us/trust-board/ |
| Sherwood Forest Hospitals NHS Foundation Trust | Nottingham and Nottinghamshire | https://www.sfh-tr.nhs.uk/about-us/trust-board/ |
| Shrewsbury and Telford Hospital NHS Trust | Shropshire, Telford and Wrekin | https://www.sath.nhs.uk/about-us/trust-information/board-papers/ |
| South Warwickshire University NHS Foundation Trust | Coventry and Warwickshire | https://www.swft.nhs.uk/about-us/trust-board |
| The Dudley Group NHS Foundation Trust | Black Country | https://www.dgft.nhs.uk/about-us/trust-board/ |
| The Robert Jones and Agnes Hunt Orthopaedic Hospital NHS Foundation Trust | Shropshire, Telford and Wrekin | https://www.rjah.nhs.uk/About-Us/Trust-Board.aspx |
| The Royal Wolverhampton NHS Trust | Black Country | https://royalwolverhampton.nhs.uk/about-our-trust/who-we-are/our-board/ |
| United Lincolnshire Hospitals NHS Trust | Lincolnshire | https://www.ulh.nhs.uk/about-us/trust-board/ |
| University Hospital Coventry and Warwickshire NHS Trust | Coventry and Warwickshire | https://www.uhcw.nhs.uk/about-us/trust-board/ |
| University Hospitals Birmingham NHS Foundation Trust | Birmingham and Solihull | https://www.uhb.nhs.uk/about/trust-management/bod/papers/ |
| University Hospitals of Derby and Burton NHS Foundation Trust | Derbyshire | https://www.uhdb.nhs.uk/trust-board |
| University Hospitals of Leicester NHS Trust | LLR | https://www.leicestershospitals.nhs.uk/aboutus/our-trust-board/ |
| University Hospitals of North Midlands NHS Trust | Staffordshire and Stoke-on-Trent | https://www.uhnm.nhs.uk/about-us/trust-board/ |
| Walsall Healthcare NHS Trust | Black Country | https://www.walsallhealthcare.nhs.uk/about-us/how-we-are-run/board-papers/ |
| Worcestershire Acute Hospitals NHS Trust | Herefordshire and Worcestershire | https://www.waht.nhs.uk/en-GB/About-The-Trust/Papers/ |
| Wye Valley NHS Trust | Herefordshire and Worcestershire | https://www.wyevalley.nhs.uk/about-us/the-trust-board.aspx |

---

### 2.6 ACUTE HOSPITAL TRUSTS - EAST OF ENGLAND REGION (14)

| Trust Name | ICS | Board Papers URL |
|------------|-----|------------------|
| Bedfordshire Hospitals NHS Foundation Trust | BLMK | https://www.bedfordshirehospitals.nhs.uk/about-us/trust-board/ |
| Cambridge University Hospitals NHS Foundation Trust | Cambridgeshire and Peterborough | https://www.cuh.nhs.uk/about-us/trust-board/ |
| East and North Hertfordshire NHS Trust | Hertfordshire and West Essex | https://www.enherts-tr.nhs.uk/about-us/trust-board/ |
| East Suffolk and North Essex NHS Foundation Trust | Suffolk and NE Essex | https://www.esneft.nhs.uk/about-us/trust-board/ |
| James Paget University Hospitals NHS Foundation Trust | Norfolk and Waveney | https://www.jpaget.nhs.uk/about-us/trust-board/ |
| Mid and South Essex NHS Foundation Trust | Mid and South Essex | https://www.mse.nhs.uk/about-us/trust-board |
| Milton Keynes University Hospital NHS Foundation Trust | BLMK | https://www.mkuh.nhs.uk/about-us/trust-board |
| Norfolk and Norwich University Hospitals NHS Foundation Trust | Norfolk and Waveney | https://www.nnuh.nhs.uk/about-us/trust-board/ |
| North West Anglia NHS Foundation Trust | Cambridgeshire and Peterborough | https://www.nwangliaft.nhs.uk/about-us/trust-board/ |
| Princess Alexandra Hospital NHS Trust | Hertfordshire and West Essex | https://www.pah.nhs.uk/about-us/trust-board |
| Queen Elizabeth Hospital King's Lynn NHS Foundation Trust | Norfolk and Waveney | https://www.qehkl.nhs.uk/about-us/trust-board/ |
| Royal Papworth Hospital NHS Foundation Trust | Cambridgeshire and Peterborough | https://royalpapworth.nhs.uk/about-us/trust-board |
| West Hertfordshire Teaching Hospitals NHS Trust | Hertfordshire and West Essex | https://www.westhertshospitals.nhs.uk/about/trust_board/ |
| West Suffolk NHS Foundation Trust | Suffolk and NE Essex | https://www.wsh.nhs.uk/our-organisation/how-we-are-run/trust-board |

---

### 2.7 ACUTE HOSPITAL TRUSTS - NORTH WEST REGION (25)

| Trust Name | ICS | Board Papers URL |
|------------|-----|------------------|
| Alder Hey Children's NHS Foundation Trust | Cheshire and Merseyside | https://www.alderhey.nhs.uk/about-us/trust-board/ |
| Blackpool Teaching Hospitals NHS Foundation Trust | Lancashire and South Cumbria | https://www.bfwh.nhs.uk/about-us/trust-board/ |
| Bolton NHS Foundation Trust | Greater Manchester | https://www.boltonft.nhs.uk/about-us/trust-board/ |
| Countess of Chester Hospital NHS Foundation Trust | Cheshire and Merseyside | https://www.coch.nhs.uk/about-us/trust-board.aspx |
| East Cheshire NHS Trust | Cheshire and Merseyside | https://www.eastcheshire.nhs.uk/About-The-Trust/Trust-Board.htm |
| East Lancashire Hospitals NHS Trust | Lancashire and South Cumbria | https://www.elht.nhs.uk/about-us/trust-board |
| Lancashire Teaching Hospitals NHS Foundation Trust | Lancashire and South Cumbria | https://www.lancsteachinghospitals.nhs.uk/about-us/trust-board |
| Liverpool Heart and Chest Hospital NHS Foundation Trust | Cheshire and Merseyside | https://www.lhch.nhs.uk/about-us/trust-board/ |
| Liverpool University Hospitals NHS Foundation Trust | Cheshire and Merseyside | https://www.liverpoolft.nhs.uk/about-us/trust-board |
| Liverpool Women's NHS Foundation Trust | Cheshire and Merseyside | https://www.liverpoolwomens.nhs.uk/about-us/trust-board/ |
| Manchester University NHS Foundation Trust | Greater Manchester | https://mft.nhs.uk/the-trust/trust-board/ |
| Mersey and West Lancashire Teaching Hospitals NHS Trust | Cheshire and Merseyside | https://www.merseywestlancs.nhs.uk/about-us/trust-board/ |
| Mid Cheshire Hospitals NHS Foundation Trust | Cheshire and Merseyside | https://www.mcht.nhs.uk/about-us/board-directors/board-papers-and-minutes |
| Northern Care Alliance NHS Foundation Trust | Greater Manchester | https://www.northerncarealliance.nhs.uk/about-us/trust-board |
| St Helens and Knowsley Teaching Hospitals NHS Trust | Cheshire and Merseyside | https://www.sthk.nhs.uk/about-us/trust-board |
| Stockport NHS Foundation Trust | Greater Manchester | https://www.stockport.nhs.uk/boardmeets |
| Tameside and Glossop Integrated Care NHS Foundation Trust | Greater Manchester | https://www.tamesidehospital.nhs.uk/about-us/trust-board.htm |
| The Christie NHS Foundation Trust | Greater Manchester | https://www.christie.nhs.uk/about-us/the-trust/trust-board |
| The Clatterbridge Cancer Centre NHS Foundation Trust | Cheshire and Merseyside | https://www.clatterbridgecc.nhs.uk/about-us/trust-board |
| The Walton Centre NHS Foundation Trust | Cheshire and Merseyside | https://www.thewaltoncentre.nhs.uk/about-us/trust-board.htm |
| University Hospitals of Morecambe Bay NHS Foundation Trust | Lancashire and South Cumbria | https://www.uhmb.nhs.uk/about-us/trust-board |
| Warrington and Halton Teaching Hospitals NHS Foundation Trust | Cheshire and Merseyside | https://www.whh.nhs.uk/about-us/trust-board |
| Wirral University Teaching Hospital NHS Foundation Trust | Cheshire and Merseyside | https://www.wuth.nhs.uk/about-us/trust-board/ |
| Wrightington, Wigan and Leigh NHS Foundation Trust | Greater Manchester | https://www.wwl.nhs.uk/about-us/trust-board |

---

### 2.8 ACUTE HOSPITAL TRUSTS - NORTH EAST AND YORKSHIRE REGION (22)

| Trust Name | ICS | Board Papers URL |
|------------|-----|------------------|
| Airedale NHS Foundation Trust | West Yorkshire | https://www.airedale-trust.nhs.uk/about-us/trust-board/ |
| Barnsley Hospital NHS Foundation Trust | South Yorkshire | https://www.barnsleyhospital.nhs.uk/about-us/trust-board/ |
| Bradford Teaching Hospitals NHS Foundation Trust | West Yorkshire | https://www.bradfordhospitals.nhs.uk/about-us/trust-board/ |
| Calderdale and Huddersfield NHS Foundation Trust | West Yorkshire | https://www.cht.nhs.uk/about-us/trust-board |
| County Durham and Darlington NHS Foundation Trust | North East and North Cumbria | https://www.cddft.nhs.uk/about-us/trust-board.aspx |
| Doncaster and Bassetlaw Teaching Hospitals NHS Foundation Trust | South Yorkshire | https://www.dbth.nhs.uk/about-us/trust-board/ |
| Gateshead Health NHS Foundation Trust | North East and North Cumbria | https://www.qegateshead.nhs.uk/about-us/trust-board |
| Harrogate and District NHS Foundation Trust | West Yorkshire | https://www.hdft.nhs.uk/about-us/trust-board/ |
| Hull University Teaching Hospitals NHS Trust | Humber and North Yorkshire | https://www.hey.nhs.uk/about-us/trust-board/ |
| Leeds Teaching Hospitals NHS Trust | West Yorkshire | https://www.leedsth.nhs.uk/about-us/trust-board/ |
| Mid Yorkshire Teaching NHS Trust | West Yorkshire | https://www.midyorks.nhs.uk/board-meetings/ |
| Newcastle upon Tyne Hospitals NHS Foundation Trust | North East and North Cumbria | https://www.newcastle-hospitals.nhs.uk/about-us/trust-board/ |
| North Cumbria Integrated Care NHS Foundation Trust | North East and North Cumbria | https://www.ncic.nhs.uk/about-us/trust-board |
| North Lincolnshire and Goole NHS Foundation Trust | Humber and North Yorkshire | https://www.nlg.nhs.uk/about-us/trust-board/ |
| North Tees and Hartlepool NHS Foundation Trust | North East and North Cumbria | https://www.nth.nhs.uk/about-us/trust-board/ |
| Northumbria Healthcare NHS Foundation Trust | North East and North Cumbria | https://www.northumbria.nhs.uk/about-us/trust-board |
| Sheffield Teaching Hospitals NHS Foundation Trust | South Yorkshire | https://www.sth.nhs.uk/about-us/trust-board |
| South Tees Hospitals NHS Foundation Trust | North East and North Cumbria | https://www.southtees.nhs.uk/about-us/trust-board/ |
| South Tyneside and Sunderland NHS Foundation Trust | North East and North Cumbria | https://www.stsft.nhs.uk/about-us/trust-board |
| The Rotherham NHS Foundation Trust | South Yorkshire | https://www.therotherhamft.nhs.uk/about-us/trust-board/ |
| York and Scarborough Teaching Hospitals NHS Foundation Trust | Humber and North Yorkshire | https://www.yorkhospitals.nhs.uk/about-us/trust-board/ |
| Sheffield Children's NHS Foundation Trust | South Yorkshire | https://www.sheffieldchildrens.nhs.uk/about-us/trust-board/ |

---

### 2.9 MENTAL HEALTH TRUSTS (50)

| Trust Name | Region | Board Papers URL |
|------------|--------|------------------|
| Avon and Wiltshire Mental Health Partnership NHS Trust | South West | https://www.awp.nhs.uk/about-us/trust-board |
| Berkshire Healthcare NHS Foundation Trust | South East | https://www.berkshirehealthcare.nhs.uk/about-us/trust-board/ |
| Birmingham and Solihull Mental Health NHS Foundation Trust | Midlands | https://www.bsmhft.nhs.uk/about-us/trust-board/ |
| Black Country Healthcare NHS Foundation Trust | Midlands | https://www.blackcountryhealthcare.nhs.uk/about-us/trust-board |
| Bradford District Care NHS Foundation Trust | North East & Yorkshire | https://www.bdct.nhs.uk/about-us/trust-board/ |
| Cambridgeshire and Peterborough NHS Foundation Trust | East of England | https://www.cpft.nhs.uk/about-us/trust-board |
| Central and North West London NHS Foundation Trust | London | https://www.cnwl.nhs.uk/about-us/trust-board |
| Cheshire and Wirral Partnership NHS Foundation Trust | North West | https://www.cwp.nhs.uk/about-us/trust-board |
| Cornwall Partnership NHS Foundation Trust | South West | https://www.cornwallft.nhs.uk/about-us/trust-board |
| Cumbria, Northumberland, Tyne and Wear NHS Foundation Trust | North East & Yorkshire | https://www.cntw.nhs.uk/about-us/trust-board/ |
| Derbyshire Healthcare NHS Foundation Trust | Midlands | https://www.derbyshirehealthcareft.nhs.uk/about-us/trust-board |
| Devon Partnership NHS Trust | South West | https://www.dpt.nhs.uk/about-us/trust-board |
| Dorset Healthcare University NHS Foundation Trust | South West | https://www.dorsethealthcare.nhs.uk/about-us/trust-board |
| East London NHS Foundation Trust | London | https://www.elft.nhs.uk/information-about-elft/our-board/trust-board-meetings |
| Essex Partnership University NHS Foundation Trust | East of England | https://www.eput.nhs.uk/about-us/trust-board/ |
| Gloucestershire Health and Care NHS Foundation Trust | South West | https://www.ghc.nhs.uk/about-us/trust-board/ |
| Greater Manchester Mental Health NHS Foundation Trust | North West | https://www.gmmh.nhs.uk/about-us/trust-board |
| Hampshire and Isle of Wight Healthcare NHS Foundation Trust | South East | https://hiowhealthcare.nhs.uk/about-us/our-board/meetings-and-papers |
| Hertfordshire Partnership University NHS Foundation Trust | East of England | https://www.hpft.nhs.uk/about-us/trust-board/ |
| Humber Teaching NHS Foundation Trust | North East & Yorkshire | https://www.humber.nhs.uk/about-us/trust-board.htm |
| Kent and Medway NHS and Social Care Partnership Trust | South East | https://www.kmpt.nhs.uk/about-us/trust-board/ |
| Lancashire and South Cumbria NHS Foundation Trust | North West | https://www.lscft.nhs.uk/about-us/trust-board |
| Leeds and York Partnership NHS Foundation Trust | North East & Yorkshire | https://www.leedsandyorkpft.nhs.uk/about-us/trust-board/ |
| Leicestershire Partnership NHS Trust | Midlands | https://www.leicspart.nhs.uk/about-us/trust-board/ |
| Lincolnshire Partnership NHS Foundation Trust | Midlands | https://www.lpft.nhs.uk/about-us/trust-board |
| Mersey Care NHS Foundation Trust | North West | https://www.merseycare.nhs.uk/about-us/trust-board |
| Midlands Partnership University NHS Foundation Trust | Midlands | https://www.mpft.nhs.uk/about-us/trust-board |
| Norfolk and Suffolk NHS Foundation Trust | East of England | https://www.nsft.nhs.uk/about-us/trust-board/ |
| North London NHS Foundation Trust | London | https://www.northlondonmentalhealth.nhs.uk/meetings-and-papers/ |
| North Staffordshire Combined Healthcare NHS Trust | Midlands | https://www.combined.nhs.uk/about-us/trust-board/ |
| Northamptonshire Healthcare NHS Foundation Trust | Midlands | https://www.nhft.nhs.uk/about-us/trust-board |
| Nottinghamshire Healthcare NHS Foundation Trust | Midlands | https://www.nottinghamshirehealthcare.nhs.uk/trust-board |
| Oxford Health NHS Foundation Trust | South East | https://www.oxfordhealth.nhs.uk/about-us/trust-board/ |
| Oxleas NHS Foundation Trust | London | https://oxleas.nhs.uk/about-us/trust-board/ |
| Pennine Care NHS Foundation Trust | North West | https://www.penninecare.nhs.uk/about-us/trust-board |
| Rotherham Doncaster and South Humber NHS Foundation Trust | North East & Yorkshire | https://www.rdash.nhs.uk/about-us/trust-board/ |
| Sheffield Health and Social Care NHS Foundation Trust | North East & Yorkshire | https://www.shsc.nhs.uk/about-us/trust-board |
| Solent NHS Trust | South East | https://www.solent.nhs.uk/about-us/trust-board/ |
| Somerset NHS Foundation Trust | South West | https://www.somersetft.nhs.uk/about-us/trust-board/ |
| South London and Maudsley NHS Foundation Trust | London | https://www.slam.nhs.uk/about-us/trust-board/ |
| South West London and St George's Mental Health NHS Trust | London | https://www.swlstg.nhs.uk/about-us/trust-board |
| South West Yorkshire Partnership NHS Foundation Trust | North East & Yorkshire | https://www.southwestyorkshire.nhs.uk/about-us-2/how-were-run/our-trust-board/meeting-papers/ |
| Surrey and Borders Partnership NHS Foundation Trust | South East | https://www.sabp.nhs.uk/aboutus/board-of-directors/board-meetings-papers |
| Sussex Partnership NHS Foundation Trust | South East | https://www.sussexpartnership.nhs.uk/about-us/trust-board |
| Tavistock and Portman NHS Foundation Trust | London | https://www.tavistockandportman.nhs.uk/about-us/trust-board/ |
| Tees, Esk and Wear Valleys NHS Foundation Trust | North East & Yorkshire | https://www.tewv.nhs.uk/about-us/trust-board/ |
| West London NHS Trust | London | https://www.westlondon.nhs.uk/about-us/trust-board/board-meetings |

---

### 2.10 COMMUNITY HEALTHCARE TRUSTS (13)

| Trust Name | Region | Board Papers URL |
|------------|--------|------------------|
| Bridgewater Community Healthcare NHS Foundation Trust | North West | https://www.bridgewater.nhs.uk/about-us/trust-board/ |
| Cambridgeshire Community Services NHS Trust | East of England | https://www.cambscommunityservices.nhs.uk/about-us/trust-board |
| Central London Community Healthcare NHS Trust | London | https://clch.nhs.uk/about-us/publications/board-papers-and-committee-tor |
| Derbyshire Community Health Services NHS Foundation Trust | Midlands | https://www.dchs.nhs.uk/about-us/trust-board |
| Hertfordshire Community NHS Trust | East of England | https://www.hct.nhs.uk/about-us/trust-board/ |
| Leeds Community Healthcare NHS Trust | North East & Yorkshire | https://www.leedscommunityhealthcare.nhs.uk/about-us/trust-board/ |
| Lincolnshire Community Health Services NHS Trust | Midlands | https://www.lincolnshirecommunityhealthservices.nhs.uk/about-us/our-trust-board/trust-board-papers |
| Norfolk Community Health and Care NHS Trust | East of England | https://www.norfolkcommunityhealthandcare.nhs.uk/about-us/trust-board |
| Shropshire Community Health NHS Trust | Midlands | https://www.shropscommunityhealth.nhs.uk/about-us/trust-board |
| Sussex Community NHS Foundation Trust | South East | https://www.sussexcommunity.nhs.uk/about-us/how-we-are-run/board-of-directors/board-meetings-and-papers |
| Wirral Community Health and Care NHS Foundation Trust | North West | https://www.wchc.nhs.uk/about-us/trust-board/ |
| Your Healthcare CIC | London | https://www.yourhealthcare.org/about-us/board/ |

---

### 2.11 NHS TRUST BOARD PAPERS URL PATTERNS

Most NHS trusts follow these standard URL patterns:
- `/about-us/trust-board/`
- `/about-us/trust-board/board-papers/`
- `/about-us/trust-board/meetings-and-papers/`
- `/about/trust-board/`
- `/about-us/how-we-are-run/trust-board/`

---

## SECTION 3: INTEGRATED CARE BOARDS (42 Total)

### 3.1 NHS EAST OF ENGLAND REGION (6 ICBs)

| # | ICB Name | Board Papers URL |
|---|----------|------------------|
| 1 | NHS Bedfordshire, Luton and Milton Keynes ICB | https://bedfordshirelutonandmiltonkeynes.icb.nhs.uk/about-us/board-meetings/ |
| 2 | NHS Cambridgeshire and Peterborough ICB | https://www.cpics.org.uk/icb-meeting-papers/ |
| 3 | NHS Hertfordshire and West Essex ICB | https://www.hertsandwestessex.ics.nhs.uk/about/icb/board/integrated-care-board-meetings-in-public/ |
| 4 | NHS Mid and South Essex ICB | https://www.midandsouthessex.ics.nhs.uk/about/boards/integrated-care-board/ |
| 5 | NHS Norfolk and Waveney ICB | https://improvinglivesnw.org.uk/about-us/our-nhs-integrated-care-board-icb/icb-publications/ |
| 6 | NHS Suffolk and North East Essex ICB | https://suffolkandnortheastessex.icb.nhs.uk/board-papers/ |

---

### 3.2 NHS LONDON REGION (5 ICBs)

| # | ICB Name | Board Papers URL |
|---|----------|------------------|
| 7 | NHS North Central London ICB | https://nclhealthandcare.org.uk/icb/about/meetings/ncl-icb-board-of-members-meetings/papers-from-previous-meetings/ |
| 8 | NHS North East London ICB | https://northeastlondon.icb.nhs.uk/about-us/about-nhs-north-east-london/our-board/board-meetings-and-papers/ |
| 9 | NHS North West London ICB | https://www.nwlondonicb.nhs.uk/about-us/About-NHS-NW-London-1/ICB/board-meetings-and-papers |
| 10 | NHS South East London ICB | https://www.selondonics.org/icb/meetings-board-papers-reports/icb-meetings/ |
| 11 | NHS South West London ICB | https://www.southwestlondon.icb.nhs.uk/publications/ |

---

### 3.3 NHS MIDLANDS REGION (11 ICBs)

| # | ICB Name | Board Papers URL |
|---|----------|------------------|
| 12 | NHS Birmingham and Solihull ICB | https://www.birminghamsolihull.icb.nhs.uk/about-us/our-committees/integrated-care-board/integrated-care-board-papers |
| 13 | NHS Black Country ICB | https://blackcountry.icb.nhs.uk/about-us/our-board |
| 14 | NHS Coventry and Warwickshire ICB | https://www.happyhealthylives.uk/integrated-care-board/about-us/icb-board-meetings/ |
| 15 | NHS Derby and Derbyshire ICB | https://joinedupcarederbyshire.co.uk/derbyshire-integrated-care-board/integrated-care-board-meetings/ |
| 16 | NHS Herefordshire and Worcestershire ICB | https://herefordshireandworcestershire.icb.nhs.uk/meetings/board-papers |
| 17 | NHS Leicester, Leicestershire and Rutland ICB | https://leicesterleicestershireandrutland.icb.nhs.uk/about/board-meetings/ |
| 18 | NHS Lincolnshire ICB | https://lincolnshire.icb.nhs.uk/about-us/our-board-and-committees/icb-board-meetings/ |
| 19 | NHS Northamptonshire ICB | https://www.icnorthamptonshire.org.uk/icbboardmeetings/ |
| 20 | NHS Nottingham and Nottinghamshire ICB | https://notts.icb.nhs.uk/about-us/our-icb-board/ |
| 21 | NHS Shropshire, Telford and Wrekin ICB | https://www.shropshiretelfordandwrekin.nhs.uk/about-us/how-we-are-run/meet-our-people/meet-our-board/ |
| 22 | NHS Staffordshire and Stoke-on-Trent ICB | https://staffsstoke.icb.nhs.uk/your-nhs-integrated-care-board/our-publications/board-papers/ |

---

### 3.4 NHS NORTH EAST AND YORKSHIRE REGION (4 ICBs)

| # | ICB Name | Board Papers URL |
|---|----------|------------------|
| 23 | NHS Humber and North Yorkshire ICB | https://humberandnorthyorkshire.icb.nhs.uk/meetings-and-papers/ |
| 24 | NHS North East and North Cumbria ICB | https://northeastnorthcumbria.nhs.uk/about-us/corporate-information/governance/meetings-and-agendas/integrated-care-board/ |
| 25 | NHS South Yorkshire ICB | https://southyorkshire.icb.nhs.uk/our-information/meetings-and-papers |
| 26 | NHS West Yorkshire ICB | https://www.westyorkshire.icb.nhs.uk/meetings/integrated-care-board |

---

### 3.5 NHS NORTH WEST REGION (3 ICBs)

| # | ICB Name | Board Papers URL |
|---|----------|------------------|
| 27 | NHS Cheshire and Merseyside ICB | https://www.cheshireandmerseyside.nhs.uk/about/nhs-cheshire-and-merseyside/ |
| 28 | NHS Greater Manchester ICB | https://gmintegratedcare.org.uk/nhs-gm/ |
| 29 | NHS Lancashire and South Cumbria ICB | https://www.lancashireandsouthcumbria.icb.nhs.uk/about-us/board/meetings-and-papers |

---

### 3.6 NHS SOUTH EAST REGION (6 ICBs)

| # | ICB Name | Board Papers URL |
|---|----------|------------------|
| 30 | NHS Buckinghamshire, Oxfordshire and Berkshire West ICB | https://www.bucksoxonberksw.icb.nhs.uk/about-us/board-meetings/ |
| 31 | NHS Frimley ICB | https://frimley.icb.nhs.uk/policies-and-documents/governing-body-meeting-papers |
| 32 | NHS Hampshire and Isle of Wight ICB | https://www.hantsiow.icb.nhs.uk/icb/integrated-care-board-meetings |
| 33 | NHS Kent and Medway ICB | https://www.kentandmedway.icb.nhs.uk/news-and-events/events |
| 34 | NHS Surrey Heartlands ICB | https://www.surreyheartlands.org/nhs-surrey-heartlands-integrated-care-board-meetings |
| 35 | NHS Sussex ICB | https://www.sussex.ics.nhs.uk/nhs-sussex/our-board/board-meetings-in-public/ |

---

### 3.7 NHS SOUTH WEST REGION (7 ICBs)

| # | ICB Name | Board Papers URL |
|---|----------|------------------|
| 36 | NHS Bath and North East Somerset, Swindon and Wiltshire ICB | https://bsw.icb.nhs.uk/about-us/governance/meetings/ |
| 37 | NHS Bristol, North Somerset and South Gloucestershire ICB | https://bnssg.icb.nhs.uk/about-us/our-board/ |
| 38 | NHS Cornwall and The Isles Of Scilly ICB | https://cios.icb.nhs.uk/about/meetings/ |
| 39 | NHS Devon ICB | https://devon.icb.nhs.uk/nhs-devon-board/meetings-and-papers/meeting-papers-and-minutes/ |
| 40 | NHS Dorset ICB | https://nhsdorset.nhs.uk/about/board/ |
| 41 | NHS Gloucestershire ICB | https://www.nhsglos.nhs.uk/category/board-meetings/ |
| 42 | NHS Somerset ICB | https://nhssomerset.nhs.uk/publications/board-papers/ |

---

## SECTION 4: COUNCIL WEBCAST PLATFORMS

### 4.1 Public-i.tv (100+ Councils)

**Platform:** https://public-i.tv/
**Features:**
- Live + archived webcasts
- Auto-transcription (searchable)
- Integration with ModernGov
- Agenda-linked timestamps

**Example Portal:** `https://royalgreenwich.public-i.tv/core/portal/home`

**Councils Using Public-i.tv:**
- Royal Greenwich
- Croydon
- Brighton & Hove
- Many others (100+)

### 4.2 YouTube Channels

Many councils maintain YouTube channels for meeting recordings:

| Council | YouTube Channel |
|---------|----------------|
| West Northamptonshire | @WestNorthamptonshireCouncil |
| York City Council | @CityofYorkCouncil |
| Croydon Council | @CroydonCouncil |
| Brighton & Hove | YouTube channel available |

---

## SECTION 5: FIRE AND RESCUE AUTHORITIES (44 Total)

### 5.1 OVERVIEW

Fire and Rescue Authorities (FRAs) are statutory bodies that oversee fire and rescue services in England. As of 2025, HMICFRS inspects all 44 fire and rescue services. Each authority publishes board meeting papers and minutes.

**Note:** From April 2025, the Ministry of Housing, Communities and Local Government (MHCLG) has responsibility (previously Home Office).

---

### 5.2 FIRE AND RESCUE SERVICES BY REGION

#### South Western Region (5)

| Service Name | Website | Board Papers Platform |
|-------------|---------|----------------------|
| Avon Fire & Rescue Service | https://www.avonfire.gov.uk | https://www.avonfire.gov.uk/about-us/your-fire-authority |
| Cornwall Fire & Rescue Service | https://www.cornwall.gov.uk/fire-and-rescue-service/ | County Council website |
| Devon & Somerset Fire & Rescue Service | https://www.dsfire.gov.uk | https://www.dsfire.gov.uk/about-us/our-organisation/our-governance |
| Dorset & Wiltshire Fire & Rescue Service | https://www.dwfire.org.uk | https://www.dwfire.org.uk/about-us/our-organisation/fire-authority/ |
| Gloucestershire Fire & Rescue Service | https://www.gloucestershire.gov.uk/glosfire/ | County Council website |

#### South Eastern Region (8)

| Service Name | Website | Board Papers Platform |
|-------------|---------|----------------------|
| Buckinghamshire Fire & Rescue Service | https://bucksfire.gov.uk | https://bucksfire.gov.uk/authority-meetings/ |
| East Sussex Fire & Rescue Service | https://www.esfrs.org | https://www.esfrs.org/about-us/east-sussex-fire-authority/ |
| Hampshire & Isle of Wight Fire & Rescue Service | https://www.hantsfire.gov.uk | https://www.hantsfire.gov.uk/about-us/our-organisation/fire-authority/ |
| Kent Fire & Rescue Service | https://www.kent.fire-uk.org | https://www.kent.fire-uk.org/about-us/authority |
| Oxfordshire Fire & Rescue Service | https://www.oxfordshire.gov.uk/fire-and-community-safety | County Council website |
| Royal Berkshire Fire & Rescue Service | https://www.rbfrs.co.uk | https://www.rbfrs.co.uk/your-fire-and-rescue-service/authority/ |
| Surrey Fire & Rescue Service | https://www.surreycc.gov.uk/community/fire-and-rescue | County Council website |
| West Sussex Fire & Rescue Service | https://www.westsussex.gov.uk/fire-emergencies-and-crime | County Council website |

#### North Eastern Region (4)

| Service Name | Website | Board Papers Platform |
|-------------|---------|----------------------|
| Cleveland Fire Brigade | https://www.clevelandfire.gov.uk | https://www.clevelandfire.gov.uk/about-us/cleveland-fire-authority/ |
| County Durham and Darlington Fire & Rescue Service | https://www.ddfire.gov.uk | https://www.ddfire.gov.uk/about-us/combined-fire-authority |
| Northumberland Fire & Rescue Service | https://www.northumberlandfireandrescue.gov.uk | County Council website |
| Tyne and Wear Fire & Rescue Service | https://www.twfire.gov.uk | https://www.twfire.gov.uk/about-us/tyne-and-wear-fire-and-rescue-authority/ |

#### Yorkshire & Humberside Region (4)

| Service Name | Website | Board Papers Platform |
|-------------|---------|----------------------|
| Humberside Fire & Rescue Service | https://humbersidefire.gov.uk | https://humbersidefire.gov.uk/about-us/fire-authority |
| North Yorkshire Fire & Rescue Service | https://www.northyorksfire.gov.uk | https://www.northyorksfire.gov.uk/about-us/how-we-are-run/ |
| South Yorkshire Fire & Rescue | https://www.syfire.gov.uk | https://www.syfire.gov.uk/about-us/fire-and-rescue-authority/ |
| West Yorkshire Fire & Rescue Service | https://www.westyorksfire.gov.uk | https://www.westyorksfire.gov.uk/about-us/our-fire-and-rescue-authority/ |

#### North Western Region (5)

| Service Name | Website | Board Papers Platform |
|-------------|---------|----------------------|
| Cheshire Fire & Rescue Service | https://www.cheshirefire.gov.uk | https://www.cheshirefire.gov.uk/about-us/fire-authority |
| Cumbria Fire & Rescue Service | https://www.cumbriafire.gov.uk | County Council website |
| Lancashire Fire & Rescue Service | https://www.lancsfirerescue.org.uk | https://www.lancsfirerescue.org.uk/about-us/combined-fire-authority/ |
| Greater Manchester Fire & Rescue Service | https://www.manchesterfire.gov.uk | https://www.manchesterfire.gov.uk/about-us/fire-and-rescue-authority/ |
| Merseyside Fire & Rescue Service | https://www.merseyfire.gov.uk | https://mfra.merseyfire.gov.uk/ (ModernGov) |

#### Eastern Region (6)

| Service Name | Website | Board Papers Platform |
|-------------|---------|----------------------|
| Bedfordshire Fire & Rescue Service | https://www.bedsfire.gov.uk | https://bedsfireresauth.moderngov.co.uk/ (ModernGov) |
| Cambridgeshire Fire & Rescue Service | https://www.cambsfire.gov.uk | https://www.cambsfire.gov.uk/about-us/fire-authority/ |
| Essex Fire & Rescue Service | https://www.essex-fire.gov.uk | https://www.essex-fire.gov.uk/about-us/fire-and-rescue-authority |
| Hertfordshire Fire & Rescue Service | https://www.hertfordshire.gov.uk/services/fire-and-rescue | County Council website |
| Norfolk Fire & Rescue Service | https://www.norfolk.gov.uk/fire | County Council website |
| Suffolk Fire & Rescue Service | https://www.suffolk.gov.uk/suffolk-fire-and-rescue-service | County Council website |

#### East Midlands Region (5)

| Service Name | Website | Board Papers Platform |
|-------------|---------|----------------------|
| Derbyshire Fire & Rescue Service | https://www.derbys-fire.gov.uk | https://www.derbys-fire.gov.uk/about-us/fire-and-rescue-authority |
| Leicestershire Fire & Rescue Service | https://leics-fire.gov.uk | https://leics-fire.gov.uk/about-us/combined-fire-authority/ |
| Lincolnshire Fire & Rescue | https://www.lincolnshire.gov.uk/lincolnshire-fire-rescue | County Council website |
| Nottinghamshire Fire & Rescue Service | https://www.notts-fire.gov.uk | https://www.notts-fire.gov.uk/about-us/fire-and-rescue-authority |
| Northamptonshire Fire & Rescue Service | https://www.northantsfire.gov.uk | https://www.northantsfire.gov.uk/about-us/fire-and-rescue-authority/ |

#### West Midlands Region (5)

| Service Name | Website | Board Papers Platform |
|-------------|---------|----------------------|
| Hereford & Worcester Fire & Rescue Service | https://www.hwfire.org.uk | https://www.hwfire.org.uk/about-us/fire-and-rescue-authority/ |
| Shropshire Fire & Rescue Service | https://www.shropshirefire.gov.uk | https://www.shropshirefire.gov.uk/about-us/fire-authority |
| Staffordshire Fire & Rescue Service | https://www.staffordshirefire.gov.uk | https://www.staffordshirefire.gov.uk/about-us/fire-and-rescue-authority/ |
| Warwickshire Fire & Rescue Service | https://www.warwickshire.gov.uk/fireandrescue | County Council website |
| West Midlands Fire Service | https://www.wmfs.net | https://www.wmfs.net/about-us/fire-authority/ |

#### London (1)

| Service Name | Website | Board Papers Platform |
|-------------|---------|----------------------|
| London Fire Brigade | https://www.london-fire.gov.uk | https://www.london-fire.gov.uk/about-us/london-fire-commissioner/ |

---

## SECTION 6: POLICE AND CRIME COMMISSIONERS (37 Total)

### 6.1 OVERVIEW

Police and Crime Commissioners (PCCs) are elected officials responsible for police accountability in their force areas. They hold monthly accountability meetings and publish governance documents.

**Note:** In November 2025, the government announced PCCs will be abolished in May 2028. Functions will transfer to Combined Authority mayors or new Police and Crime Boards.

**Key Exceptions:**
- London: Mayor of London (via MOPAC)
- Greater Manchester: Mayor holds PCC powers
- West Yorkshire: Mayor holds PCC powers
- South Yorkshire: Mayor holds PCC powers (from May 2024)
- North Yorkshire: Mayor holds PCC powers (from May 2024)

---

### 6.2 POLICE AND CRIME COMMISSIONERS BY FORCE AREA

| # | Police Force Area | PCC Website |
|---|------------------|-------------|
| 1 | Avon and Somerset | https://www.avonandsomerset-pcc.gov.uk |
| 2 | Bedfordshire | https://www.bedfordshire.pcc.police.uk |
| 3 | Cambridgeshire | https://www.cambridgeshire-pcc.gov.uk |
| 4 | Cheshire | https://www.cheshire-pcc.gov.uk |
| 5 | Cleveland | https://www.cleveland.pcc.police.uk |
| 6 | Cumbria | https://www.cumbria-pcc.gov.uk |
| 7 | Derbyshire | https://www.derbyshire-pcc.gov.uk |
| 8 | Devon and Cornwall | https://www.devonandcornwall-pcc.gov.uk |
| 9 | Dorset | https://www.dorset.pcc.police.uk |
| 10 | Durham | https://www.durham-pcc.gov.uk |
| 11 | Essex | https://www.essex.pcc.police.uk |
| 12 | Gloucestershire | https://www.gloucestershire-pcc.gov.uk |
| 13 | Hampshire and Isle of Wight | https://www.hampshire-pcc.gov.uk |
| 14 | Hertfordshire | https://www.hertscommissioner.org |
| 15 | Humberside | https://www.humberside-pcc.gov.uk |
| 16 | Kent | https://www.kent-pcc.gov.uk |
| 17 | Lancashire | https://www.lancashire-pcc.gov.uk |
| 18 | Leicestershire | https://www.leics.pcc.police.uk |
| 19 | Lincolnshire | https://www.lincolnshire-pcc.gov.uk |
| 20 | Merseyside | https://www.merseysidepcc.info |
| 21 | Norfolk | https://www.norfolk-pcc.gov.uk |
| 22 | Northamptonshire | https://www.northantspcc.org.uk |
| 23 | Northumbria | https://www.northumbria-pcc.gov.uk |
| 24 | Nottinghamshire | https://www.nottinghamshire.pcc.police.uk |
| 25 | Staffordshire | https://www.staffordshire-pcc.gov.uk |
| 26 | Suffolk | https://www.suffolk-pcc.gov.uk |
| 27 | Surrey | https://www.surrey-pcc.gov.uk |
| 28 | Sussex | https://www.sussex-pcc.gov.uk |
| 29 | Thames Valley | https://www.thamesvalley-pcc.gov.uk |
| 30 | Warwickshire | https://www.warwickshire-pcc.gov.uk |
| 31 | West Mercia | https://www.westmercia-pcc.gov.uk |
| 32 | West Midlands | https://www.westmidlands-pcc.gov.uk |
| 33 | Wiltshire | https://www.wiltshire-pcc.gov.uk |

**Mayoral PCC Functions (included in Combined Authorities):**
| Force Area | Mayor/Body |
|------------|------------|
| Greater London | Mayor of London (MOPAC) |
| Greater Manchester | Mayor of Greater Manchester |
| West Yorkshire | Mayor of West Yorkshire |
| South Yorkshire | Mayor of South Yorkshire |
| North Yorkshire | Mayor of York and North Yorkshire |

---

## SECTION 7: COMBINED AUTHORITIES (12 Total)

### 7.1 OVERVIEW

Combined Authorities are statutory bodies that bring together groups of local councils to collaborate on transport, economic development, and other strategic functions. Most have directly elected mayors and publish board meeting papers.

---

### 7.2 MAYORAL COMBINED AUTHORITIES

| # | Combined Authority | Mayor | Website | Board Papers |
|---|-------------------|-------|---------|--------------|
| 1 | Greater Manchester Combined Authority | Andy Burnham | https://www.greatermanchester-ca.gov.uk | https://democracy.greatermanchester-ca.gov.uk/ |
| 2 | Liverpool City Region Combined Authority | Steve Rotheram | https://www.liverpoolcityregion-ca.gov.uk | https://liverpoolcityregion-ca.moderngov.co.uk/ |
| 3 | West Midlands Combined Authority | Richard Parker | https://www.wmca.org.uk | https://www.wmca.org.uk/who-we-are/meetings/ |
| 4 | South Yorkshire Mayoral Combined Authority | Oliver Coppard | https://www.southyorkshire-ca.gov.uk | https://southyorkshire-ca.public-i.tv/ |
| 5 | West Yorkshire Combined Authority | Tracy Brabin | https://www.westyorks-ca.gov.uk | https://westyorkshire.moderngov.co.uk/ |
| 6 | Tees Valley Combined Authority | Ben Houchen | https://teesvalley-ca.gov.uk | https://teesvalley-ca.gov.uk/about/governance/ |
| 7 | Cambridgeshire and Peterborough Combined Authority | Paul Bristow | https://cambridgeshirepeterborough-ca.gov.uk | https://cambridgeshirepeterboroughcagov.cmis.uk.com/ |
| 8 | West of England Combined Authority | Helen Godwin | https://www.westofengland-ca.gov.uk | https://westofengland-ca.moderngov.co.uk/ |
| 9 | North East Combined Authority | Kim McGuinness | https://www.northeast-ca.gov.uk | https://www.northeast-ca.gov.uk/governance |
| 10 | York and North Yorkshire Combined Authority | David Skaith | https://yorknorthyorks-ca.gov.uk | https://yorknorthyorks-ca.gov.uk/who-we-are/meetings/ |
| 11 | East Midlands Combined County Authority | Claire Ward | https://www.eastmidlands-cca.gov.uk | https://www.eastmidlands-cca.gov.uk/governance/ |
| 12 | Hull and East Yorkshire Combined Authority | (Mayor election 2026) | https://hullandeastyorkshire.gov.uk | (Being established) |

---

## SECTION 8: NATIONAL PARK AUTHORITIES (10 Total)

### 8.1 OVERVIEW

National Park Authorities are special-purpose local authorities established under the Environment Act 1995 to manage England's 10 National Parks. They hold regular board meetings and publish governance documents.

---

### 8.2 NATIONAL PARK AUTHORITIES IN ENGLAND

| # | National Park Authority | Website | Board Papers / Governance |
|---|------------------------|---------|---------------------------|
| 1 | Broads Authority | https://www.broads-authority.gov.uk | https://www.broads-authority.gov.uk/about-us/committees |
| 2 | Dartmoor National Park Authority | https://www.dartmoor.gov.uk | https://www.dartmoor.gov.uk/about-us/how-we-work/agendas-and-minutes |
| 3 | Exmoor National Park Authority | https://www.exmoor-nationalpark.gov.uk | https://www.exmoor-nationalpark.gov.uk/about-us/meetings-agendas-and-reports |
| 4 | Lake District National Park Authority | https://www.lakedistrict.gov.uk | https://www.lakedistrict.gov.uk/aboutus/governance-and-performance |
| 5 | New Forest National Park Authority | https://www.newforestnpa.gov.uk | https://www.newforestnpa.gov.uk/about-us/meetings-and-agendas/ |
| 6 | Northumberland National Park Authority | https://www.northumberlandnationalpark.org.uk | https://www.northumberlandnationalpark.org.uk/about/meetings-agendas/ |
| 7 | North York Moors National Park Authority | https://www.northyorkmoors.org.uk | https://www.northyorkmoors.org.uk/about-us/how-the-authority-works/committees-and-meetings |
| 8 | Peak District National Park Authority | https://www.peakdistrict.gov.uk | https://democracy.peakdistrict.gov.uk/ (ModernGov) |
| 9 | South Downs National Park Authority | https://www.southdowns.gov.uk | https://www.southdowns.gov.uk/meeting-agendas-and-decisions/ |
| 10 | Yorkshire Dales National Park Authority | https://www.yorkshiredales.org.uk | https://www.yorkshiredales.org.uk/about-the-authority/authority-meetings/ |

---

## SECTION 9: TIER 1 EXPANSION - MULTI-ACADEMY TRUSTS (1,154)

### 9.1 Overview

Multi-Academy Trusts (MATs) are groups of academies governed under a single trust. As of 2024, 56.5% of state-funded schools (over 10,600) are academies, with nearly 11,000 under MATs.

**Legal Basis for Minutes Access:**
- Academy Trust Handbook 2025 requires governance information on trust websites
- Agenda for every meeting must be available for public inspection on request
- Attendance records for trustees and local governors must be published
- Changes must be notified to DfE via GIAS within 14 days

**Data Source:** Get Information About Schools (GIAS) API - https://get-information-schools.service.gov.uk/

### 9.2 MAT Size Distribution

| Size Category | Number of MATs |
|---------------|----------------|
| 2-5 schools | 498 |
| 6-11 schools | 395 |
| 12-25 schools | 205 |
| 26-30 schools | ~42 |
| 31-50 schools | 42 |
| 50+ schools | 6 |
| **TOTAL** | **~1,154** |

### 9.3 Largest MATs

| Rank | MAT Name | Schools |
|------|----------|---------|
| 1 | United Learning | 92 |
| 2 | Academies Enterprise Trust | 57 |
| 3 | Harris Federation | 54 |
| 4 | Delta Academies Trust | 52 |
| 5 | Ormiston Academies Trust | 43 |
| 6 | Ark Schools | 39 |

### 9.4 Regional Distribution

| Region | Number of MATs |
|--------|----------------|
| London | 220 |
| South East | 193 |
| North East | 81 (fewest) |

### 9.5 Technical Implementation

**Scraping Complexity:** Medium
- No standard platform (unlike ModernGov for councils)
- URL patterns vary by trust
- Need to map GIAS data to governance URLs

**Example Governance URLs:**
- United Learning: https://www.unitedlearning.org.uk/about-us/governance
- Harris Federation: https://www.harrisfederation.org.uk/about-us/governance/
- Ark Schools: https://arkonline.org/about-us/governance

**Sources:**
- [FFT Education Datalab - MAT State of Play 2024](https://ffteducationdatalab.org.uk/2024/07/the-current-state-of-play-for-mats/)
- [TES MAT Tracker](https://www.tes.com/magazine/leadership/data/mat-tracker-multi-academy-trusts-map)
- [Academy Trust Governance Guide](https://www.gov.uk/government/publications/academy-trust-governance-guide)

---

## SECTION 10: TIER 1 EXPANSION - UNIVERSITIES (165)

### 10.1 Overview

UK universities are independent bodies with governing councils that typically publish meeting minutes online. All 165 universities are subject to Office for Students (OfS) oversight and follow the CUC Code of Governance.

**Key Statistics:**
- Total universities in UK: 165
- Total higher education institutions: 296 (2022/23)
- Total HE students enrolled: 2.86 million
- Largest by enrollment: Open University (140,215), UCL (51,810), Manchester (46,860)

### 10.2 Universities That Publish Council Minutes

| University | Minutes URL | Notes |
|------------|-------------|-------|
| University of Surrey | https://www.surrey.ac.uk/about/governance | With redaction policy |
| UCL | https://www.ucl.ac.uk/governance-compliance/council/ | Partial (some confidential) |
| University of Manchester | https://www.staffnet.manchester.ac.uk/governance/ | Small redactions |
| University of Oxford | https://governance.admin.ox.ac.uk/ | SSO login may be required |
| University of Kent | https://www.kent.ac.uk/governance/ | Redacted, after approval |
| Queen Mary London | https://www.qmul.ac.uk/governance/ | Except valid exemptions |
| University of Derby | https://www.derby.ac.uk/about/governance/ | Council + Audit Committee |
| University of Cambridge | https://www.governance.cam.ac.uk/ | Committees Hub |
| University of Birmingham | https://www.birmingham.ac.uk/governance/ | Council papers |
| University of Leeds | https://governance.leeds.ac.uk/ | Senate and Council |

### 10.3 University Groups

| Group | Members | Description |
|-------|---------|-------------|
| Russell Group | 24 | Research-intensive universities |
| University Alliance | 12 | Professional/technical focus |
| Million+ | 19 | Modern universities |
| Guild HE | 60+ | Smaller/specialist institutions |

### 10.4 Technical Implementation

**Scraping Complexity:** Low-Medium
- Most publish minutes in accessible locations
- Some require SSO authentication (challenge)
- Generally well-structured governance pages

**Sources:**
- [Statista HE Institutions](https://www.statista.com/statistics/915603/universities-in-the-united-kingdom-uk/)
- [Office for Students](https://www.officeforstudents.org.uk/)
- [Committee of University Chairs](https://www.universitychairs.ac.uk/)

---

## SECTION 11: TIER 1 EXPANSION - FURTHER EDUCATION COLLEGES (228)

### 11.1 Overview

Further Education colleges serve 1.6 million students annually in England. Each college has a governing body that publishes meeting minutes as part of good governance practice.

**Key Statistics:**
- Total FE colleges in UK: 260 (AoC figure)
- FE colleges in England: 228
- Sixth form colleges (standalone): 40 in England
- General FE colleges: 163
- FE workforce: 133,000 employees (54,000 teachers)

### 11.2 Provider Distribution (2024/25)

| Provider Type | Share of Adult Education |
|---------------|-------------------------|
| General FE Colleges | 49.2% |
| Local Authorities | 26.4% |
| Private Sector | 20.1% |

### 11.3 Sector Bodies

| Organisation | Role | Website |
|--------------|------|---------|
| Association of Colleges (AoC) | Main sector body | https://www.aoc.co.uk/ |
| Sixth Form Colleges Association (SFCA) | Sixth forms | https://www.sixthformcolleges.org/ |
| Education and Training Foundation | Workforce development | https://www.et-foundation.co.uk/ |

### 11.4 Sample FE Colleges

| College | Region | Governance URL |
|---------|--------|----------------|
| City of Bristol College | South West | https://www.cityofbristol.ac.uk/about-us/governance/ |
| Leeds City College | Yorkshire | https://www.leedscitycollege.ac.uk/governance/ |
| Nottingham College | East Midlands | https://www.nottinghamcollege.ac.uk/governance/ |
| Barking & Dagenham College | London | https://www.bdc.ac.uk/governance/ |
| Newcastle College | North East | https://www.ncl-coll.ac.uk/about/governance/ |

### 11.5 Technical Implementation

**Scraping Complexity:** Medium
- No standard platform
- College websites vary significantly
- Governor meeting minutes typically available on governance pages

**Sources:**
- [Association of Colleges](https://www.aoc.co.uk/about/list-of-colleges-in-the-uk)
- [Sixth Form Colleges Association](https://www.sixthformcolleges.org/)
- [GOV.UK FE Statistics 2024/25](https://explore-education-statistics.service.gov.uk/find-statistics/further-education-and-skills/)

---

## SECTION 12: TIER 1 EXPANSION - HEALTHCARE REGULATORS (10)

### 12.1 Overview

The Professional Standards Authority (PSA) oversees 10 statutory healthcare regulators in the UK. **All 10 publish board/council meeting minutes online** as they are public bodies with transparency obligations.

### 12.2 Healthcare Regulators

| # | Regulator | Abbreviation | Scope | Geographic Area | Board Minutes URL |
|---|-----------|--------------|-------|-----------------|-------------------|
| 1 | General Medical Council | GMC | Doctors, PAs, AAs | UK | https://www.gmc-uk.org/about/governance |
| 2 | Nursing and Midwifery Council | NMC | Nurses, midwives | UK | https://www.nmc.org.uk/about-us/governance/the-council/council-meetings/ |
| 3 | Health and Care Professions Council | HCPC | 15 health/care professions | UK | https://www.hcpc-uk.org/about-us/council/council-meetings/ |
| 4 | General Dental Council | GDC | Dentists, dental care professionals | UK | https://www.gdc-uk.org/about-us/what-we-do/council |
| 5 | General Pharmaceutical Council | GPhC | Pharmacists, pharmacy technicians | GB | https://www.pharmacyregulation.org/about-us/who-we-are/council |
| 6 | Pharmaceutical Society of Northern Ireland | PSNI | Pharmacists | NI | https://www.psni.org.uk/about/council/ |
| 7 | General Optical Council | GOC | Optometrists, dispensing opticians | UK | https://www.optical.org/about-us/council/ |
| 8 | General Osteopathic Council | GOsC | Osteopaths | UK | https://www.osteopathy.org.uk/about-us/the-council/ |
| 9 | General Chiropractic Council | GCC | Chiropractors | UK | https://www.gcc-uk.org/about-us/council |
| 10 | Social Work England | SWE | Social workers | England | https://www.socialworkengland.org.uk/about-us/our-board/ |

### 12.3 Key Characteristics

- **Regulated occupations:** 32 across all regulators
- **All are statutory public bodies** - legally required to publish governance documents
- **Consistent transparency** - board papers and minutes routinely published
- **High signal value** - discussions cover workforce, standards, policy changes

### 12.4 Technical Implementation

**Scraping Complexity:** Low
- All regulators have dedicated governance pages
- Minutes typically published as PDFs
- Well-structured, consistent publishing schedules

**Sources:**
- [Professional Standards Authority](https://www.professionalstandards.org.uk/organisations-we-oversee)
- Individual regulator websites (listed above)

---

## SECTION 13: TIER 1 EXPANSION - MAJOR ARMS-LENGTH BODIES (135)

### 13.1 Overview

Arms-Length Bodies (ALBs) are public bodies that operate with some independence from ministers but remain accountable to Parliament. As of July 2024, there are 307 ALBs, with 135 having annual spending over £5 million.

**Historical Context:**
- 2009: 832 ALBs
- 2010-15: Public Bodies Reform Programme reduced 290+ bodies
- 2023: 308 ALBs
- 2024: 307 ALBs (Labour government created ~25 new ALBs)

### 13.2 Major ALBs by Department (Selected)

| Department | Key ALBs | Spend Category |
|------------|----------|----------------|
| DHSC | NHS England, UK Health Security Agency | >£100M |
| DfT | Network Rail, Civil Aviation Authority | >£100M |
| DCMS | Arts Council England, British Library | >£50M |
| DfE | Student Loans Company, Education & Skills Funding Agency | >£100M |
| MHCLG | Homes England, Regulator of Social Housing | >£50M |
| FCO | British Council | >£100M |
| DWP | Health and Safety Executive | >£100M |

### 13.3 Sample Major ALBs with Published Board Minutes

| ALB | Parent Department | Board Papers URL |
|-----|-------------------|------------------|
| NHS England | DHSC | https://www.england.nhs.uk/about/nhs-england-board/ |
| Network Rail | DfT | https://www.networkrail.co.uk/who-we-are/our-board/ |
| Environment Agency | DEFRA | https://www.gov.uk/government/organisations/environment-agency |
| DVLA | DfT | https://www.gov.uk/government/organisations/driver-and-vehicle-licensing-agency |
| British Council | FCDO | https://www.britishcouncil.org/about-us/governance |
| Arts Council England | DCMS | https://www.artscouncil.org.uk/about-us/governance |
| Historic England | DCMS | https://historicengland.org.uk/about/governance/ |
| Natural England | DEFRA | https://www.gov.uk/government/organisations/natural-england |
| Sport England | DCMS | https://www.sportengland.org/about-us/governance |

### 13.4 ALB Categories

| Type | Description | Example |
|------|-------------|---------|
| Executive Agency | Delivers government services | DVLA, Companies House |
| Executive NDPB | Arms-length policy delivery | Arts Council, Ofsted |
| Advisory NDPB | Provides expert advice | Migration Advisory Committee |
| Tribunal NDPB | Judicial functions | Employment Tribunals |
| Public Corporation | Trading bodies | BBC, Channel 4 |

### 13.5 Technical Implementation

**Scraping Complexity:** Low
- ALBs are public bodies subject to FOI
- Most publish board papers on gov.uk or own websites
- Generally well-structured governance pages

**Sources:**
- [Cabinet Office ALB Landscape](https://www.gov.uk/government/collections/public-bodies-reform)
- [Institute for Government Quangos Report](https://www.instituteforgovernment.org.uk/publication/quangos)
- [NAO Central Oversight of ALBs](https://www.nao.org.uk/reports/central-oversight-of-arms-length-bodies/)

---

## SECTION 14: TIER 2 & 3 FUTURE SOURCES

### 14.1 Tier 2: Housing Associations (1,353)

**Status:** Voluntary publication currently; mandatory STAIRs scheme from October 2026

**Key Statistics:**
- Total private registered providers: 1,353
- Social housing owned: 2.9 million homes
- Regulated by: Regulator of Social Housing (RSH)

**Upcoming Requirements - STAIRs:**
- Publication Scheme required by: October 2026
- Information request processes required by: April 2027

**Sources:**
- [Regulator of Social Housing](https://www.gov.uk/government/organisations/regulator-of-social-housing)
- [National Housing Federation](https://www.housing.org.uk/)

### 14.2 Tier 2: Large Charities (>£1M income)

**Status:** No statutory requirement; voluntary governance reporting

**Key Statistics:**
- Charities with >£1M income: ~2,000
- Total registered charities: 170,862
- External audit required at £1M+ threshold

**Data Source:** Charity Commission Register - https://register-of-charities.charitycommission.gov.uk/

### 14.3 Tier 3: State Schools (24,479)

**Status:** Minutes available on request; decentralized publication

**Key Statistics:**
- State-funded schools in England: 24,479
- Academies: 10,628 (56.5%)
- Maintained schools: 9,530 (43.5%)

**Legal Basis:**
- School Governance Regulations 2013: Minutes must be available to any "interested person"
- FOI 2000: State schools expected to publish proactively

**Challenge:** Highly decentralized - each school manages own website, no central portal

### 14.4 Tier 3: Smaller Charities (<£1M)

**Status:** Limited governance reporting; registration required at £5,000+

**Count:** 168,000+ registered charities
**Challenge:** Volume, varied reporting, limited board minute publication

---

## SOURCES

### Current Sources (Sections 1-8)

**Councils:**
- Gov.uk Official List of Councils: https://assets.publishing.service.gov.uk/media/67371541c0b2bbee1a1271ed/List_of_councils_in_England_2023.pdf
- Local Government Association: https://www.local.gov.uk/

**NHS:**
- NHS England Provider Directory: https://www.england.nhs.uk/publication/nhs-provider-directory/
- NHS England ICB Directory: https://www.england.nhs.uk/publication/nhs-integrated-care-board-directory/
- NHS Digital ODS: https://digital.nhs.uk/services/organisation-data-service

**Fire and Rescue:**
- National Fire Chiefs Council: https://nfcc.org.uk/contacts/fire-and-rescue-services/
- HMICFRS: https://hmicfrs.justiceinspectorates.gov.uk/

**Police:**
- Association of Police and Crime Commissioners: https://www.apccs.police.uk/find-your-pcc/
- Gov.uk PCCs: https://www.gov.uk/police-and-crime-commissioners

**Combined Authorities:**
- Local Government Association: https://www.local.gov.uk/topics/devolution/combined-authorities
- Institute for Government: https://www.instituteforgovernment.org.uk/explainer/english-devolution

**National Parks:**
- National Parks England: https://nationalparksengland.org.uk/our-members

### Tier 1 Expansion Sources (Sections 9-13)

**Multi-Academy Trusts:**
- GIAS (Get Information About Schools): https://get-information-schools.service.gov.uk/
- FFT Education Datalab: https://ffteducationdatalab.org.uk/
- Academy Trust Handbook 2025: https://www.gov.uk/government/publications/academy-trust-handbook
- TES MAT Tracker: https://www.tes.com/magazine/leadership/data/mat-tracker-multi-academy-trusts-map

**Universities:**
- Office for Students: https://www.officeforstudents.org.uk/
- Committee of University Chairs: https://www.universitychairs.ac.uk/
- HESA Statistics: https://www.hesa.ac.uk/

**Further Education Colleges:**
- Association of Colleges: https://www.aoc.co.uk/
- Sixth Form Colleges Association: https://www.sixthformcolleges.org/
- Education and Training Foundation: https://www.et-foundation.co.uk/

**Healthcare Regulators:**
- Professional Standards Authority: https://www.professionalstandards.org.uk/
- Individual regulator websites (see Section 12)

**Arms-Length Bodies:**
- Cabinet Office Public Bodies: https://www.gov.uk/government/collections/public-bodies-reform
- Institute for Government: https://www.instituteforgovernment.org.uk/
- NAO Central Oversight: https://www.nao.org.uk/reports/central-oversight-of-arms-length-bodies/

### Platforms

- ModernGov (Civica): https://www.moderngov.co.uk/
- CMIS: https://cmis.uk/
- Public-i.tv: https://public-i.tv/

---

*Document compiled: February 2026*

**Current Sources (Active): 676**
- 317 Local Councils
- 214 NHS Trusts
- 42 Integrated Care Boards
- 44 Fire and Rescue Authorities
- 37 Police and Crime Commissioners
- 12 Combined Authorities
- 10 National Park Authorities

**Tier 1 Expansion (Planned): 1,692**
- 1,154 Multi-Academy Trusts
- 165 Universities
- 228 Further Education Colleges
- 10 Healthcare Regulators
- 135 Major Arms-Length Bodies

**GRAND TOTAL: ~2,368 organisations**

**Tier 2/3 Future Potential:**
- 1,353 Housing Associations (Oct 2026+)
- ~2,000 Large Charities
- 24,479 State Schools (decentralized)
