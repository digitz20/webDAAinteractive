


require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');




// Function to load leads from leads.json
function loadLeads() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'leads.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading leads.json:', error);
    return [];
  }
}

// Function to save leads to leads.json
function saveLeads(leads) {
  try {
    fs.writeFileSync(path.join(__dirname, 'leads.json'), JSON.stringify(leads, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving leads.json:', error);
  }
}

// Helper function to format email local part as a name
function formatEmailLocalPartAsName(email) {
  if (!email || typeof email !== 'string') {
    return 'Our Team';
  }

  const localPart = email.split('@')[0];

  // List of generic local parts that should not be used as a sender name
  // Check if the local part is a generic name
  if (CONFIG.genericNames.includes(localPart.toLowerCase())) {
    return 'Our Team';
  }

  // Replace common separators with spaces and split into words
  const words = localPart.replace(/[._-]/g, ' ').split(' ');

  // Capitalize each word and join them
  const formattedName = words.map(word => {
    if (word.length === 0) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');

  // If after formatting, the name is empty or still looks generic (e.g., just initials),
  // or if it's a single letter, fall back to 'Our Team'
  if (!formattedName.trim() || formattedName.length <= 2) {
    return 'Our Team';
  }

  return formattedName;
}

/**
 * Selects the best sender name for a lead based on available information.
 * Prioritizes scraped person's name, then non-generic email local parts,
 * then company name, finally defaulting to 'Our Team'.
 * @param {object} lead - The lead object containing emails, companyName, and sender info.
 * @returns {string} The selected sender name.
 */
function selectBestSenderName(lead) {
  // 1. Prioritize scraped person's name if available
  if (lead && lead.sender && lead.sender.first_name && lead.sender.last_name) {
    const scrapedName = `${lead.sender.first_name} ${lead.sender.last_name}`;
    // Ensure the scraped name isn't too short or generic-looking
    if (scrapedName.trim().length > 2 && !CONFIG.genericNames.includes(scrapedName.toLowerCase())) {
      return scrapedName;
    }
  }

  // 2. Look for a non-generic name from email local parts
  let bestEmailName = '';
  if (lead && lead.emails && lead.emails.length > 0) {
    for (const email of lead.emails) {
      const derivedName = formatEmailLocalPartAsName(email);
      if (derivedName !== 'Our Team') {
        // Found a non-generic name, use it
        bestEmailName = derivedName;
        break; // Take the first good one
      }
    }
  }

  if (bestEmailName) {
    return bestEmailName;
  }

  // 3. Fallback to company name if available and not too generic
  if (lead && lead.companyName) {
    const companyName = lead.companyName.trim();
    // Check if company name is not just a generic term or too short
    if (companyName.length > 2 && !CONFIG.genericNames.includes(companyName.toLowerCase())) {
      return companyName;
    }
  }

  // 4. Default to 'Our Team'
  return 'Our Team';
}

// ---------- CONFIG ----------
const CONFIG = {
  genericNames: [
    'info', 'sales', 'support', 'admin', 'administrator', 'noreply', 'no-reply',
    'contact', 'webmaster', 'help', 'enquiries', 'enquiry', 'marketing', 'pr',
    'press', 'billing', 'accounts', 'finance', 'hr', 'jobs', 'careers', 'team',
    'hello', 'office', 'customerservice', 'feedback', 'abuse', 'security',
    'privacy', 'legal', 'postmaster', 'hostmaster', 'usenet', 'news', 'web',
    'dev', 'development', 'test', 'testing', 'noreply', 'noresponse', 'auto',
    'automated', 'system', 'daemon', 'mailer-daemon', 'undisclosed-recipients',
    'everyone', 'all', 'group', 'list', 'subscribe', 'unsubscribe', 'newsletter',
    'digest', 'forum', 'community', 'notifications', 'alert', 'alerts', 'report',
    'reports', 'status', 'update', 'updates', 'service', 'services', 'client',
    'clients', 'customer', 'customers', 'guest', 'guests', 'user', 'users',
    'member', 'members', 'partner', 'partners', 'affiliate', 'affiliates',
    'investor', 'investors', 'media', 'relations', 'public', 'relations',
    'management', 'executive', 'ceo', 'cfo', 'cto', 'coo', 'cmo', 'cio', 'cso',
    'president', 'director', 'manager', 'supervisor', 'coordinator', 'assistant',
    'reception', 'receptionist', 'frontdesk', 'booking', 'reservations', 'orders',
    'returns', 'shipping', 'delivery', 'dispatch', 'warehouse', 'inventory',
    'purchasing', 'procurement', 'vendor', 'vendors', 'supplier', 'suppliers',
    'donations', 'donate', 'fundraising', 'volunteer', 'volunteers', 'events',
    'event', 'webinar', 'webinars', 'seminar', 'seminars', 'training', 'education',
    'academy', 'institute', 'research', 'development', 'rnd', 'innovation',
    'solutions', 'consulting', 'consultant', 'advisory', 'advisor', 'expert',
    'experts', 'specialist', 'specialists', 'engineer', 'engineers', 'developer',
    'developers', 'programmer', 'programmers', 'designer', 'designers', 'artist',
    'artists', 'creative', 'editor', 'editors', 'writer', 'writers', 'author',
    'authors', 'publisher', 'publishers', 'moderator', 'moderators', 'adminteam',
    'supportteam', 'helpdesk', 'techsupport', 'webcontact', 'clientservices',
    'accountmanager', 'accounting', 'legal', 'privacy', 'terms', 'pressoffice',
    'mediarelations', 'webmasterteam', 'it', 'tech', 'techteam', 'it-support',
    'it-helpdesk', 'it-admin', 'itadmin', 'itsupport', 'ithelpdesk', 'itmanager',
    'it-manager', 'webteam', 'web-team', 'webadmin', 'web-admin', 'webdeveloper',
    'web-developer', 'webdesigner', 'web-designer', 'webmasterteam', 'webmaster-team',
    'webmasteradmin', 'webmaster-admin', 'webmasterhelp', 'webmaster-help',
    'webmasterinfo', 'webmaster-info', 'webmastercontact', 'webmaster-contact',
    'webmasterfeedback', 'webmaster-feedback', 'webmasterinquiry', 'webmaster-inquiry',
    'webmastersupport', 'webmaster-support', 'webmastergeneral', 'webmaster-general',
    'webmasterpublic', 'webmaster-public', 'webmastermedia', 'webmaster-media',
    'webmasterpress', 'webmaster-press', 'webmastermarketing', 'webmaster-marketing',
    'webmastersales', 'webmaster-sales', 'webmasterhr', 'webmaster-hr',
    'webmasterjobs', 'webmaster-jobs', 'webmastercareers', 'webmaster-careers',
    'webmasterbilling', 'webmaster-billing', 'webmasteraccounts', 'webmaster-accounts',
    'webmasterfinance', 'webmaster-finance', 'webmasterlegal', 'webmaster-legal',
    'webmasterprivacy', 'webmaster-privacy', 'webmasterterms', 'webmaster-terms',
    'webmastersecurity', 'webmaster-security', 'webmasterabuse', 'webmaster-abuse',
    'webmasterfeedback', 'webmaster-feedback', 'webmasterhello', 'webmaster-hello',
    'webmasteroffice', 'webmaster-office', 'webmastercustomerservice', 'webmaster-customerservice',
    'webmasterfeedback', 'webmaster-feedback', 'webmasterabuse', 'webmaster-abuse',
    'webmastersecurity', 'webmaster-security', 'webmasterprivacy', 'webmaster-privacy',
    'webmasterlegal', 'webmaster-legal', 'webmasterpostmaster', 'webmaster-postmaster',
    'webmasterhostmaster', 'webmaster-hostmaster', 'webmasterusenet', 'webmaster-usenet',
    'webmasternews', 'webmaster-news', 'webmasterweb', 'webmaster-web',
    'webmasterdev', 'webmaster-dev', 'webmasterdevelopment', 'webmaster-development',
    'webmastertest', 'webmaster-test', 'webmastertesting', 'webmaster-testing',
    'webmasternoreply', 'webmaster-noreply', 'webmasternoresponse', 'webmaster-noresponse',
    'webmasterauto', 'webmaster-auto', 'webmasterautomated', 'webmaster-automated',
    'webmastersystem', 'webmaster-system', 'webmasterdaemon', 'webmaster-daemon',
    'webmastermailer-daemon', 'webmaster-mailer-daemon', 'webmasterundisclosed-recipients',
    'webmaster-undisclosed-recipients', 'webmastereveryone', 'webmaster-everyone',
    'webmasterall', 'webmaster-all', 'webmastergroup', 'webmaster-group',
    'webmasterlist', 'webmaster-list', 'webmastersubscribe', 'webmaster-subscribe',
    'webmasterunsubscribe', 'webmaster-unsubscribe', 'webmasternewsletter', 'webmaster-newsletter',
    'webmasterdigest', 'webmaster-digest', 'webmasterforum', 'webmaster-forum',
    'webmastercommunity', 'webmaster-community', 'webmasternotifications', 'webmaster-notifications',
    'webmasteralert', 'webmaster-alert', 'webmasteralerts', 'webmaster-alerts',
    'webmasterreport', 'webmaster-report', 'webmasterreports', 'webmaster-reports',
    'webmasterstatus', 'webmaster-status', 'webmasterupdate', 'webmaster-update',
    'webmasterupdates', 'webmaster-updates', 'webmasterservice', 'webmaster-service',
    'webmasterservices', 'webmaster-services', 'webmasterclient', 'webmaster-client',
    'webmasterclients', 'webmaster-clients', 'webmastercustomer', 'webmaster-customer',
    'webmastercustomers', 'webmaster-customers', 'webmasterguest', 'webmaster-guest',
    'webmasterguests', 'webmaster-guests', 'webmasteruser', 'webmaster-user',
    'webmasterusers', 'webmaster-users', 'webmastermember', 'webmaster-member',
    'webmastermembers', 'webmaster-members', 'webmasterpartner', 'webmaster-partner',
    'webmasterpartners', 'webmaster-partners', 'webmasteraffiliate', 'webmaster-affiliate',
    'webmasteraffiliates', 'webmaster-affiliates', 'webmasterinvestor', 'webmaster-investor',
    'webmasterinvestors', 'webmaster-investors', 'webmastermedia', 'webmaster-media',
    'webmasterrelations', 'webmaster-relations', 'webmasterpublic', 'webmaster-public',
    'webmastermanagement', 'webmaster-management', 'webmasterexecutive', 'webmaster-executive',
    'webmasterceo', 'webmaster-ceo', 'webmastercfo', 'webmaster-cfo',
    'webmastercto', 'webmaster-cto', 'webmastercoo', 'webmaster-coo',
    'webmastercmo', 'webmaster-cmo', 'webmastercio', 'webmaster-cio',
    'webmastercso', 'webmaster-cso', 'webmasterpresident', 'webmaster-president',
    'webmasterdirector', 'webmaster-director', 'webmastermanager', 'webmaster-manager',
    'webmastersupervisor', 'webmaster-supervisor', 'webmastercoordinator', 'webmaster-coordinator',
    'webmasterassistant', 'webmaster-assistant', 'webmasterreception', 'webmaster-reception',
    'webmasterreceptionist', 'webmaster-receptionist', 'webmasterfrontdesk', 'webmaster-frontdesk',
    'webmasterbooking', 'webmaster-booking', 'webmasterreservations', 'webmaster-reservations',
    'webmasterorders', 'webmaster-orders', 'webmasterreturns', 'webmaster-returns',
    'webmastershipping', 'webmaster-shipping', 'webmasterdelivery', 'webmaster-delivery',
    'webmasterdispatch', 'webmaster-dispatch', 'webmasterwarehouse', 'webmaster-warehouse',
    'webmasterinventory', 'webmaster-inventory', 'webmasterpurchasing', 'webmaster-purchasing',
    'webmasterprocurement', 'webmaster-procurement', 'webmastervendor', 'webmaster-vendor',
    'webmastervendors', 'webmaster-vendors', 'webmastersupplier', 'webmaster-supplier',
    'webmastersuppliers', 'webmaster-suppliers', 'webmasterdonations', 'webmaster-donations',
    'webmasterdonate', 'webmaster-donate', 'webmasterfundraising', 'webmaster-fundraising',
    'webmastervolunteer', 'webmaster-volunteer', 'webmastervolunteers', 'webmaster-volunteers',
    'webmasterevents', 'webmaster-events', 'webmasterevent', 'webmaster-event',
    'webmasterwebinar', 'webmaster-webinar', 'webmasterwebinars', 'webmaster-webinars',
    'webmasterseminar', 'webmaster-seminar', 'webmasterseminars', 'webmaster-seminars',
    'webmastertraining', 'webmaster-training', 'webmastereducation', 'webmaster-education',
    'webmasteracademy', 'webmaster-academy', 'webmasterinstitute', 'webmaster-institute',
    'webmasterresearch', 'webmaster-research', 'webmasterdevelopment', 'webmaster-development',
    'webmasterrnd', 'webmaster-rnd', 'webmasterinnovation', 'webmaster-innovation',
    'webmastersolutions', 'webmaster-solutions', 'webmasterconsulting', 'webmaster-consulting',
    'webmasterconsultant', 'webmaster-consultant', 'webmasteradvisory', 'webmaster-advisory',
    'webmasteradvisor', 'webmaster-advisor', 'webmasterexpert', 'webmaster-expert',
    'webmasterexperts', 'webmaster-experts', 'webmasterspecialist', 'webmaster-specialist',
    'webmasterspecialists', 'webmaster-specialists', 'webmasterengineer', 'webmaster-engineer',
    'webmasterengineers', 'webmaster-engineers', 'webmasterdeveloper', 'webmaster-developer',
    'webmasterdevelopers', 'webmaster-developers', 'webmasterprogrammer', 'webmaster-programmer',
    'webmasterprogrammers', 'webmaster-programmers', 'webmasterdesigner', 'webmaster-designer',
    'webmasterdesigners', 'webmaster-designers', 'webmasterartist', 'webmaster-artist',
    'webmasterartists', 'webmaster-artists', 'webmastercreative', 'webmaster-creative',
    'webmastereditor', 'webmaster-editor', 'webmastereditors', 'webmaster-editors',
    'webmasterwriter', 'webmaster-writer', 'webmasterwriters', 'webmaster-writers',
    'webmasterauthor', 'webmaster-author', 'webmasterauthors', 'webmaster-authors',
    'webmasterpublisher', 'webmaster-publisher', 'webmasterpublishers', 'webmaster-publishers',
    'webmastermoderator', 'webmaster-moderator', 'webmastermoderators', 'webmaster-moderators'
  ],
  industries: [
    'Agriculture', 'Apparel', 'Banking', 'Biotechnology', 'Chemical', 'Communications', 'Construction',
    'Consulting', 'Education', 'Electronics', 'Energy', 'Engineering', 'Entertainment', 'Environmental',
    'Finance', 'Food & Beverage', 'Government', 'Healthcare', 'Hospitality', 'Insurance', 'Machinery',
    'Manufacturing', 'Media', 'Not For Profit', 'Other', 'Pharmaceuticals', 'Recreation', 'Retail',
    'Shipping', 'Technology', 'Telecommunications', 'Transportation', 'Utilities', 'Wholesale',
    'Automotive', 'Aerospace', 'Plastics', 'Metallurgy', 'Pulp and Paper', 'Furniture', 'Footwear',
    'Ceramics', 'Glass', 'Industrial Machinery', 'Electrical Equipment', 'Medical Devices', 'Renewable Energy',
    'Accounting', 'Airlines/Aviation', 'Alternative Dispute Resolution', 'Alternative Medicine', 'Animation',
    'Architecture & Planning', 'Arts and Crafts', 'Automotive', 'Aviation & Aerospace', 'Broadcast Media',
    'Building Materials', 'Business Supplies and Equipment', 'Capital Markets', 'Civic & Social Organization',
    'Civil Engineering', 'Commercial Real Estate', 'Computer & Network Security', 'Computer Games',
    'Computer Hardware', 'Computer Networking', 'Computer Software', 'Consumer Electronics', 'Consumer Goods',
    'Consumer Services', 'Cosmetics', 'Dairy', 'Defense & Space', 'Design', 'E-Learning', 'Electrical/Electronic Manufacturing',
    'Events Services', 'Executive Office', 'Facilities Services', 'Farming', 'Financial Services', 'Fine Art',
    'Fishery', 'Food Production', 'Fund-Raising', 'Gambling & Casinos', 'Government Administration',
    'Government Relations', 'Graphic Design', 'Health, Wellness and Fitness', 'Higher Education', 'Human Resources',
    'Import and Export', 'Individual & Family Services', 'Industrial Automation', 'Information Services',
    'Information Technology and Services', 'International Affairs', 'International Trade and Development',
    'Investment Banking', 'Investment Management', 'Judiciary', 'Law Enforcement', 'Law Practice', 'Legal Services',
    'Legislative Office', 'Leisure, Travel & Tourism', 'Libraries', 'Logistics and Supply Chain', 'Luxury Goods & Jewelry',
    'Management Consulting', 'Maritime', 'Market Research', 'Marketing and Advertising', 'Mechanical or Industrial Engineering',
    'Media Production', 'Medical Practice', 'Mental Health Care', 'Military', 'Mining & Metals', 'Motion Pictures and Film',
    'Museums and Institutions', 'Music', 'Nanotechnology', 'Newspapers', 'Non-Profit Organization Management',
    'Oil & Energy', 'Online Media', 'Outsourcing/Offshoring', 'Package/Freight Delivery', 'Packaging and Containers',
    'Paper & Forest Products', 'Performing Arts', 'Philanthropy', 'Photography', 'Plastics', 'Political Organization',
    'Primary/Secondary Education', 'Printing', 'Professional Training & Coaching', 'Program Development',
    'Public Policy', 'Public Relations and Communications', 'Public Safety', 'Publishing', 'Railroad Manufacture',
    'Ranching', 'Real Estate', 'Religious Institutions', 'Research', 'Restaurants', 'Security and Investigations',
    'Semiconductors', 'Shipbuilding', 'Sporting Goods', 'Sports', 'Staffing and Recruiting', 'Supermarkets',
    'Telecommunications', 'Textiles', 'Think Tanks', 'Tobacco', 'Translation and Localization', 'Venture Capital & Private Equity',
    'Veterinary', 'Warehousing', 'Wholesale', 'Wine and Spirits', 'Wireless', 'Writing and Editing',
    'Food Processing', 'Textile', 'Wood', 'Printing', 'Refined Petroleum', 'Rubber', 'Non-Metallic Mineral', 'Basic Metals', 'Fabricated Metal', 'Computer and Electronic',
    'Electrical', 'Transportation Equipment', 'Furniture Manufacturing', 'Toy', 'Sporting Goods Manufacturing' 
    
  ],
  
  googleResultsPerSearch: 50,
  maxPagesToVisit: 20,
  maxEmailsPerDomain: 10, // Maximum number of unique emails to collect per domain
  maxPeopleToScrape: 10, // Maximum number of people (names, titles, emails) to scrape per website
  peoplePageConcurrency: 5, // Number of people pages to scrape concurrently


  emailDelay: { min: 30000, max: 60000 }, // 30 to 60 seconds
  emailLinks: [
    "https://wallet-interact-1-5v.onrender.com",
  ],
  searchTlds: [
    '.com', '.org', '.net', '.io', '.co', '.ad', '.ae', '.af', '.ag', '.al',
    '.am', '.ao', '.ar', '.at', '.au', '.az', '.ba', '.bb', '.bd', '.be',
    '.bf', '.bg', '.bh', '.bi', '.bj', '.bn', '.bo', '.br', '.bs', '.bt',
    '.bw', '.by', '.bz', '.ca', '.cd', '.cf', '.cg', '.ch', '.ci', '.ck',
    '.cl', '.cm', '.cn', '.co', '.cr', '.cu', '.cv', '.cy', '.cz', '.de',
    '.dj', '.dk', '.dm', '.do', '.dz', '.ec', '.ee', '.eg', '.er', '.es',
    '.et', '.eu', '.fi', '.fj', '.fm', '.fr', '.ga', '.gb', '.gd', '.ge',
    '.gh', '.gm', '.gn', '.gq', '.gr', '.gt', '.gw', '.gy', '.hk', '.hn',
    '.hr', '.ht', '.hu', '.id', '.ie', '.il', '.in', '.iq', '.ir', '.is',
    '.it', '.jm', '.jo', '.jp', '.ke', '.kg', '.kh', '.ki', '.km', '.kn',
    '.kp', '.kr', '.kw', '.kz', '.la', '.lb', '.lc', '.li', '.lk', '.lr',
    '.ls', '.lt', '.lu', '.lv', '.ly', '.ma', '.mc', '.md', '.me', '.mg',
    '.mh', '.mk', '.ml', '.mm', '.mn', '.mo', '.mr', '.mt', '.mu', '.mv',
    '.mw', '.mx', '.my', '.mz', '.na', '.ne', '.ng', '.ni', '.nl', '.no',
    '.np', '.nr', '.nz', '.om', '.pa', '.pe', '.pg', '.ph', '.pk', '.pl',
    '.pt', '.pw', '.py', '.qa', '.ro', '.rs', '.ru', '.rw', '.sa', '.sb',
    '.sc', '.sd', '.se', '.sg', '.si', '.sk', '.sl', '.sm', '.sn', '.so',
    '.sr', '.st', '.sv', '.sy', '.sz', '.td', '.tg', '.th', '.tj', '.tl',
    '.tm', '.tn', '.to', '.tr', 'tt', '.tv', '.tz', '.ua', '.ug', '.us',
    '.uy', '.uz', '.va', '.vc', '.ve', '.vn', '.vu', '.ws', '.ye', '.za',
    '.zm', '.zw'
  ],
irrelevantPhrases: [
'team member','general contact','find us','contact us','about us','our team','read more','view all','copyright','privacy policy','terms of service',
'member','email member','send email','get in touch','reach out','inquiry','support','help','admin','administrator','info','sales','hr','human resources',
'customer service','technical support','billing','accounts','finance','marketing','press','media','news','events','careers','jobs','recruiting',
'partnerships','business development','investors','board','leadership','executives','management','staff','personnel','directory','phone','fax',
'address','location','map','directions','office','headquarters','branch','department','division','group','committee','association','organization',
'noreply','no-reply','no reply','do not reply','donotreply','postmaster','webmaster','site admin','admin team','support team','helpdesk','tech support',
'feedback','suggestions','web contact','client services','account manager','accounting','legal','privacy','terms','press office','media relations',
'home','menu','navigation','footer','header','sidebar','main','content','page','site','website','online','web','portal','platform',
'login','register','signup','signin','logout','account','profile','dashboard','settings','preferences','user','guest','visitor',
'download','upload','file','document','image','video','audio','pdf','doc','xls','ppt','zip','rar','exe','app','software',
'search','filter','sort','order','buy','sell','purchase','cart','checkout','payment','shipping','delivery','tracking',
'subscribe','newsletter','blog','forum','community','social','share','like','comment','post','thread','topic','discussion',
'faq','help center','knowledge base','tutorial','guide','manual','documentation','api','developer','code','script','plugin',
'cookie','analytics','tracking','gdpr','compliance','security','encryption','ssl','https','domain','hosting','server',
'error','404','500','maintenance','coming soon','under construction','temporarily unavailable','redirect','link','url',
'button','form','input','John Doe','textarea','select','checkbox','radio','submit','reset','cancel','close','open','toggle','expand','collapse',
'icon','logo','banner','advertisement','ad','promo','offer','deal','discount','coupon','voucher','gift','free','trial',
'call to action','cta','landing page','homepage','index','default','welcome','hello','hi','greetings','thanks','thank you',
'contact form','message','subject','body','attachment','captcha','verification','confirm','validate','authenticate',
'system','automatic','bot','robot','crawler','spider','indexer','search engine','google','bing','yahoo','duckduckgo',
'meta','tag','keyword','description','title','heading','paragraph','list','table','row','column','cell','div','span','class','id',
'javascript','jquery','css','html','xml','json','endpoint','request','response','status','header','body',
'database','query','record','field','value','key','index','constraint','trigger','procedure',
'backup','restore','sync','update','upgrade','patch','version','release','changelog','roadmap','milestone','sprint',
'project','task','issue','bug','feature','enhancement','fix','deploy','staging','production','dev','test',
'integration','continuous','deployment','pipeline','workflow','automation','ci cd','git','github','gitlab','repository','repo',
'branch','commit','merge','pull request','push','clone','fork','source','codebase','library','framework',
'dependency','package','module','component','widget','plugin','extension','addon','theme','template','layout','design',
'color','font','style','responsive','mobile','desktop','tablet','screen','resolution','pixel','viewport',
'accessibility','aria','alt text','screen reader','keyboard navigation',
'performance','speed','optimization','cache','compression','lazy loading','cdn',
'cloud','aws','azure','gcp','firebase','digitalocean',
'docker','kubernetes','container','virtual machine','serverless','lambda','microservice','monolith',
'agile','scrum','kanban','waterfall','methodology','process','workflow',
'developer','tester','qa','analyst','architect','engineer','specialist','consultant',
'vendor','supplier','partner','client','customer','user','stakeholder','shareholder','investor',
'manager','director','vp','executive','officer','chairman','president','secretary','treasurer','advisor',
'recruiter','hiring manager','talent acquisition','people operations','employee experience',
'compensation','benefits','payroll','onboarding','offboarding','performance review','training',
'compliance','policy','procedure','handbook','ethics','diversity','inclusion','culture',
'remote work','hybrid','workspace','meeting room','conference','webinar','seminar','workshop',
'presentation','demo','pitch','proposal','contract','agreement','nda','sla','disclaimer',
'insurance','risk','assessment','audit','certification','regulation','law',
'intellectual property','patent','trademark','copyright','license',
'merger','acquisition','ipo','valuation','funding','investment','venture capital','angel investor',
'revenue','profit','loss','margin','roi','kpi','metric','analytics','reporting','dashboard',
'market research','survey','interview','focus group','testing',
'conversion','funnel','retention','churn','segmentation','persona','journey','experience',
'brand','identity','tagline','messaging','content','copywriting','seo','sem','ppc',
'influencer','ambassador','advocate','referral','affiliate','sponsorship','testimonial','review',
'rating','complaint','resolution','satisfaction','loyalty','engagement',
'reach','impression','click','goal','objective','strategy','tactic','campaign','initiative','program',
'timeline','deadline','deliverable','scope','budget','resource','allocation','roadmap',
'get listed','list your business','add business','add listing','submit business','claim listing','claim your business',
'remove listing','remove company','edit listing','featured listing','premium listing','top listings',
'browse categories','all categories','view category','popular searches','top companies','related companies',
'nearby businesses','similar companies','business listing','company listing','directory listing',
'read more','learn more','see more','view more','click here','tap here','load more','show more',
'back to top','next page','previous page','open menu','close menu','quick links','useful links',
'log in','sign in','sign up','create account','forgot password','reset password','join now','register now','my account',
'nigeria','lagos','abuja','port harcourt','ceo','cto','cfo','cmo','cio','cso','board member','advisory board','executive board','senior','junior','associate'
,'principal','fellow','intern','apprentice','alumni','faculty','our people','staff list','leadership team','management team','board of directors','executive committee',
'all rights reserved','terms of use','cookie policy','site map','back to top',
'next page','previous page','page of','powered by','developed by','designed by','phone number','email address','contact info','ibadan','ghana','kenya','africa',
'head office','main office','regional office','global office',
'latest articles','recent posts','blog post','news update','featured article','press release','trending topics',
'apply now','contact now','buy now','order now','get started','start now','request quote','get quote',
'subscribe now','download now','watch video','play video',
'follow us','share this','like us','join community','invite friends','leave a comment','post comment',
'all rights reserved','terms and conditions','privacy notice','cookie policy','legal notice','site map'
],
  irrelevantKeywords: [
    'glassdoor', 'linkedin', 'facebook', 'twitter', 'instagram', 'youtube', 'wikipedia',
    'bloomberg', 'forbes', 'fortune', 'inc', 'reuters', 'techcrunch', 'wsj', 'nytimes', 'washingtonpost', 'theguardian', 'bbc', 'cnn', 'cnbc',
    'businessinsider', 'fastcompany', 'wired', 'marketwatch', 'money.cnn', 'seekingalpha', 'thestreet', 'yahoo', 'ycombinator',
    'crunchbase', 'owler', 'zoominfo', 'apollo.io', 'dnb.com', 'hoovers', 'manta', 'yellowpages', 'yelp', 'thomasnet',
    'alibaba', 'amazon', 'ebay', 'etsy', 'walmart', 'duckduckgo'
  ],
  
  dataFile: 'leads.json',
}

let leads = [];
if (fs.existsSync(CONFIG.dataFile)) {
  try {
    const data = fs.readFileSync(CONFIG.dataFile, 'utf8');
    if (data) { // Check if data is not empty
      leads = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading or parsing leads.json:', error);
    // If there's an error, leads remains an empty array
  }
}

// ---------- EMAIL ACCOUNTS ----------
const emailAccounts = [];
let currentAccountIndex = 0;

// Load email accounts from .env
for (let i = 1; i <= 10; i++) { // Assuming a max of 10 accounts
  const smtpHost = process.env[`GMAIL_SMTP_HOST_${i}`];
  const smtpPort = process.env[`GMAIL_SMTP_PORT_${i}`];
  const smtpUser = process.env[`GMAIL_SMTP_USER_${i}`];
  const smtpPass = process.env[`GMAIL_SMTP_PASS_${i}`];
  const senderEmail = process.env[`GMAIL_SENDER_EMAIL_${i}`];

  if (smtpHost && smtpPort && smtpUser && smtpPass && senderEmail) {
    emailAccounts.push({
      smtpHost,
      smtpPort: parseInt(smtpPort),
      smtpUser,
      smtpPass,
      senderEmail,
      limitExceeded: false,
      emailsSentToday: 0, // New counter for emails sent today
      transporter: null // Will be created on first use
    });
  } else {
    break; // Stop if we can't find the next account
  }
}

if (emailAccounts.length === 0) {
  console.error("No Gmail SMTP accounts configured. Please set GMAIL_SMTP_HOST_1, GMAIL_SMTP_PORT_1, GMAIL_SMTP_USER_1, GMAIL_SMTP_PASS_1, and GMAIL_SENDER_EMAIL_1 in your .env file.");
  process.exit(1);
}

console.log(`[SUCCESS] Loaded ${emailAccounts.length} Gmail SMTP accounts.`);

let emailSendingPaused = false;
let limitCheckPaused = false; // New state for hourly checking
let emailQueueProcessorInterval; // To hold the interval ID
let pauseTimeout;
let probeInterval;
let lastNoLeadsLogTime = 0; // Tracks when "No unsent leads" was last logged
let consecutiveNoLeadsCount = 0; // Tracks consecutive times no leads are found
const MAX_CONSECUTIVE_NO_LEADS = 6; // Threshold for stopping email processor



// Helper to create transporter
function createTransporter(account) {
  console.log(`Attempting to create transporter for ${account.senderEmail} on host: ${account.smtpHost || 'smtp.gmail.com'}, port: ${account.smtpPort}, secure: ${account.smtpPort === 465}`);
  return nodemailer.createTransport({
    host: account.smtpHost || 'smtp.gmail.com', // Use account.smtpHost if provided, otherwise default to smtp.gmail.com
    port: account.smtpPort,
    secure: account.smtpPort === 465, // Use SSL if port is 465
    auth: {
      user: account.smtpUser,
      pass: account.smtpPass,
    },
  });
}


// ---------- EMAIL FUNCTION ----------
async function sendEmail(to, lead, leadSenderName) {
  if (emailSendingPaused) {
    console.log('Email sending is currently paused.');
    return false;
  }


  const account = emailAccounts[currentAccountIndex];
  
   // Create transporter if it doesn't exist for this account
  if (!account.transporter) {
    account.transporter = createTransporter(account);
  }

  const emailTemplate = fs.readFileSync(path.join(__dirname, 'email_template.html'), 'utf-8');
  const randomLink = CONFIG.emailLinks[Math.floor(Math.random() * CONFIG.emailLinks.length)];

  let htmlContent = emailTemplate
    .replace('{random_link}', randomLink)
    // Removed logo replacement as per user request
    .replace('{email_user}', to.split('@')[0])
    .replace('{recipient_email}', to)
    .replace('{timestamp}', new Date().toLocaleString());

  // Construct the 'from' address using the pre-determined leadSenderName
  let fromAddress;

  // Modify the account.senderEmail to add a +tag before the @
  const [localPart, domainPart] = account.senderEmail.split('@');
  let alias = '';
  if (lead && lead.companyName) {
    alias = lead.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '');    // Trim leading/trailing hyphens
  }

  // Fallback if alias is empty after sanitization
  if (!alias) {
    alias = 'general';
  }

  const modifiedAccountSenderEmail = `${localPart}+${alias}@${domainPart}`;

  // Use the leadSenderName directly
  fromAddress = `${leadSenderName} <${modifiedAccountSenderEmail}>`;
  htmlContent = htmlContent.replace('{sender_name}', leadSenderName);

  const mailOptions = {
    from: fromAddress,
    to: to,
    subject: 'Update: Transition to Payroll via DAinteractive 1.5v',
    html: htmlContent,
    replyTo: (lead && lead.sender && lead.sender.email) ? lead.sender.email : undefined,
  };

  // console.log('Mail Options before sending:', mailOptions);
  // console.log('lead.sender.email:', (lead && lead.sender && lead.sender.email) ? lead.sender.email : 'Not available');

  try {
    await account.transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to} from ${fromAddress} using Gmail SMTP.`);
    account.emailsSentToday++; // Increment counter
    if (account.emailsSentToday >= 450) {
      console.log(`[INFO] Account ${account.senderEmail} has reached its 450 email limit for today. Switching to the next one.`);
      account.limitExceeded = true;
      currentAccountIndex = (currentAccountIndex + 1) % emailAccounts.length;
    }
    return true;
  } catch (error) {
    console.error(`Error sending email to ${to} from ${account.senderEmail} using Gmail SMTP:`, error);

    // Any error will cause a switch to the next account.
    console.log(`Error with account ${account.senderEmail}. Switching to the next one.`);
    emailAccounts[currentAccountIndex].limitExceeded = true;
    currentAccountIndex = (currentAccountIndex + 1) % emailAccounts.length;

    if (emailAccounts.every(acc => acc.limitExceeded)) {
      console.log('All email accounts have exceeded their limits. Pausing email sending and initiating hourly probe.');
      emailSendingPaused = true;
      limitCheckPaused = true;
      // Clear any existing probe interval to avoid duplicates
      if (probeInterval) clearInterval(probeInterval);
      // Set up hourly probe, only during working hours
      probeInterval = setInterval(() => {
        if (isAllowedTime()) {
          probeEmailQueue();
        } else {
          console.log('Hourly probe skipped: Outside of working hours.');
        }
      }, 60 * 60 * 1000); // Check every hour
    }
    return false;
  }
}

async function probeEmailQueue() {
  if (!isAllowedTime()) {
    console.log('Probe check skipped: Outside of working hours.');
    return;
  }
  if (!limitCheckPaused) {
    return;
  }

  console.log('Hourly check: Probing to see if Gmail SMTP sending limit is lifted...');
  const leads = loadLeads();
  const unsentLead = leads.find(lead => !lead.emailsSent && lead.emails.length > 0);

  if (!unsentLead) {
    console.log('Probe check: No more unsent emails found. Stopping hourly checks.');
    limitCheckPaused = false;
    emailSendingPaused = false;
    if (probeInterval) clearInterval(probeInterval);
    return;
  }

  // Use the first account for probing
  currentAccountIndex = 0;
  // Ensure transporter is created for the probing account
  if (!emailAccounts[currentAccountIndex].transporter) {
    emailAccounts[currentAccountIndex].transporter = createTransporter(emailAccounts[currentAccountIndex]);
  }

  // Try sending the first email of the first unsent lead
  const emailToSend = unsentLead.emails[0];
  console.log('[DEBUG] Attempting to send probe email via sendEmail function.');
  const success = await sendEmail(emailToSend, unsentLead);

  if (success) {
    console.log('Probe successful! Gmail SMTP limit has been lifted. Resuming normal email sending.');
    limitCheckPaused = false;
    emailSendingPaused = false;
    emailAccounts.forEach(acc => {
      acc.limitExceeded = false;
      acc.emailsSentToday = 0; // Reset daily counter
    });
    if (probeInterval) clearInterval(probeInterval);
    // Immediately trigger the main processor
    emailQueueProcessor();
  } else {
    // The sendEmail function will have already logged the specific error
    console.log('Probe failed. Gmail SMTP limit is still in effect. Will check again in 1 hour.');
  }
}


// Maintain a global set of sent emails to prevent duplicates across all leads
const sentEmailsGlobal = new Set();

async function emailQueueProcessor() {
  const now = new Date();
  const today = now.toDateString();
  if (!global.lastResetDay || global.lastResetDay !== today) {
    emailAccounts.forEach(acc => acc.emailsSentToday = 0);
    global.lastResetDay = today;
    emailSendingPaused = false; // Reset email sending pause
    limitCheckPaused = false; // Reset limit check pause
    console.log('Daily email send count and pause states reset for all accounts.');
  }

  // Hourly check at 8 AM to send email if paused
  if (now.getHours() === 8 && limitCheckPaused) {
    console.log('It\'s 8 AM and email sending is paused. Initiating hourly probe.');
    await probeEmailQueue();
    // After probing, if limits are lifted, emailQueueProcessor will be called again.
    // If limits are still in effect, it will remain paused.
    return; // Exit this run of emailQueueProcessor, it will be re-triggered if probe is successful
  }

  if (!isAllowedTime()) {
    console.log('Outside of working hours. Email queue processor will not run.');
    return;
  }
  if (emailSendingPaused || limitCheckPaused) {
    console.log('Email queue processor is currently paused.');
    return;
  }

  console.log('Running email queue processor...'); // Modified log
  const sentEmailsGlobal = loadSentEmails(); // Load previously sent emails
  const leads = loadLeads();

  const unsentLeads = leads.filter(lead => !lead.emailsSent);
    console.log(`Found ${unsentLeads.length} unsent leads after filtering.`); // Added log

  if (unsentLeads.length === 0) {
    consecutiveNoLeadsCount++;
    if (consecutiveNoLeadsCount > MAX_CONSECUTIVE_NO_LEADS) {
      console.log(`[INFO] No unsent leads found for ${MAX_CONSECUTIVE_NO_LEADS} consecutive checks. Stopping email queue processor.`);
      clearInterval(emailQueueProcessorInterval);
      emailQueueProcessorInterval = null; // Clear the interval ID
      emailSendingPaused = true; // Also pause sending to prevent accidental restarts
      return; // Exit the function
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // Define 1 hour in milliseconds

    // Only log "No unsent leads" if it hasn't been logged in the last hour
    if (now - lastNoLeadsLogTime > oneHour) {
      console.log('No unsent leads to process. Will check again periodically.');
      lastNoLeadsLogTime = now; // Update the last logged time
    }
  } else {
    consecutiveNoLeadsCount = 0; // Reset counter if leads are found
  }

  if (unsentLeads.length === 0) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // Define 1 hour in milliseconds

    // Only log "No unsent leads" if it hasn't been logged in the last hour
    if (now - lastNoLeadsLogTime > oneHour) {
      console.log('No unsent leads to process. Will check again periodically.');
      lastNoLeadsLogTime = now; // Update the last logged time
    }
    return; // This return is correct; it just means this specific run has nothing to send.
  }

  console.log(`Found ${unsentLeads.length} leads with unsent emails.`); // Modified log

  for (const lead of unsentLeads) {
    // Determine the best sender name for this lead once
    const leadSenderName = selectBestSenderName(lead);

    if (!lead.emails || lead.emails.length === 0) {
      lead.emailsSent = true;
      console.log(`Lead ${lead.website} has no emails. Marking as sent.`); // Added log
      continue;
    }

    const emailsToSend = lead.emails.filter(email => !sentEmailsGlobal.has(email.toLowerCase()));

    if (emailsToSend.length === 0) {
      // All emails for this lead were already sent in previous runs
      lead.emailsSent = true;
      console.log(`All emails for lead ${lead.website} already sent or in global sent list. Marking as sent.`); // Added log
      continue;
    }

    const uniqueEmailsToSend = [...new Set(emailsToSend)];
    console.log(`Lead ${lead.website} has ${uniqueEmailsToSend.length} unique email(s) to send. Initial lead.emails length: ${lead.emails.length}`); // Modified log

    for (const email of uniqueEmailsToSend) {
      if (emailSendingPaused) {
        console.log('Email sending paused. Breaking from email loop.'); // Modified log
        break; // Break from sending emails for the CURRENT lead
      }

      const success = await sendEmail(email, lead, leadSenderName);
      if (success) {
        console.log(`Successfully sent email to ${email}.`); // Modified log
        sentEmailsGlobal.add(email.toLowerCase());
        saveSentEmails(sentEmailsGlobal); // Save updated sent emails

        // Remove the sent email from the lead's emails array
        const emailIndex = lead.emails.findIndex(e => e.toLowerCase() === email.toLowerCase());
        if (emailIndex > -1) {
          lead.emails.splice(emailIndex, 1);
          console.log(`Removed ${email} from lead.emails. Remaining emails: ${lead.emails.length}`); // Added log
        }

        // If there are no more emails for this lead, mark it as fully sent
        // if (lead.emails.length === 0) {
        //   lead.emailsSent = true;
        //   console.log(`Email sent for lead ${lead.website}. Marking lead as sent.`);
        // } else {
        //   console.log(`Email sent for lead ${lead.website}. Remaining emails: ${lead.emails.length}.`);
        // }
        // await wait(randomInt(CONFIG.emailDelay.min, CONFIG.emailDelay.max)); // REMOVED: Delay moved outside inner loop
        // break; // Removed break to allow sending all emails for the lead
      } else {
        // If sendEmail returns false, the account is likely limited.
        if (emailSendingPaused) {
          console.log('Email sending limit reached. Pausing queue processor.'); // Modified log
          break; // Break from the email loop
        }
        console.log(`Failed to send to ${email}, will retry in the next cycle.`); // Modified log
        // Don't break here, maybe it was a transient issue with one email.
        // The main pause logic will handle stopping.
      }
    }

    // After attempting to send all emails for the current lead, check if all were sent.
    if (lead.emails.length === 0) {
      lead.emailsSent = true;
      console.log(`All emails for lead ${lead.website} have been sent. Marking lead as sent. lead.emailsSent: ${lead.emailsSent}`); // Modified log
    } else {
      console.log(`Some emails for lead ${lead.website} were sent. Remaining emails: ${lead.emails.length}. lead.emailsSent: ${lead.emailsSent}`); // Modified log
    }

    // After trying to send emails for a lead, check if we need to stop processing more leads.
    if (emailSendingPaused) {
        console.log('Email sending is paused. Stopping lead processing for this cycle.'); // Modified log
        break; // Break from the main lead loop
    }

    // ADDED: Delay after processing all emails for a single lead
    await wait(randomInt(CONFIG.emailDelay.min, CONFIG.emailDelay.max));
  }

  console.log('Email queue processing cycle finished. Saving state...'); // Modified log
  const leadsToKeep = leads.filter(lead => !lead.emailsSent);

  if (leadsToKeep.length < leads.length) {
    console.log(`Deleted ${leads.length - leadsToKeep.length} leads that had all emails sent.`); // Modified log
  }
  // Save the remaining leads (those not marked as emailsSent = true)
  console.log(`Saving ${leadsToKeep.length} leads to leads.json.`);
  saveLeads(leadsToKeep);

  console.log('Email queue processing finished for this cycle.'); // Modified log
}


// ---------- UTILITY ----------
const randomInt = (min,max) => Math.floor(Math.random()*(max-min+1))+min;
const wait = ms => new Promise(r => setTimeout(r, ms));
function isAllowedTime() {
  return true;
}

function isValidDomain(domain) {
  const domainRegex = /^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/;
  return domainRegex.test(domain);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Define a hierarchy for job titles to determine "least position"
const jobTitleHierarchy = {
  // Higher score means higher position
  'founder': 10, 'ceo': 10, 'chief executive officer': 10,
  'president': 9,
  'cfo': 8, 'chief financial officer': 8,
  'coo': 8, 'chief operating officer': 8,
  'cto': 8, 'chief technology officer': 8,
  'cmo': 8, 'chief marketing officer': 8,
  'vp': 7, 'vice president': 7,
  'director': 6,
  'head of': 5, 'manager': 5,
  'lead': 4, 'senior': 4,
  'specialist': 3, 'analyst': 3, 'associate': 3,
  'junior': 2,
  'intern': 1,
  'assistant': 1,
  'representative': 1,
  'executive': 1, // Often entry-level in some contexts
  'officer': 1, // Can be entry-level in some contexts
  'coordinator': 1,
  'administrator': 1,
  'support': 1,
  'clerk': 1,
  'staff': 1,
  'member': 1,
  'general contact': 0, // Lowest possible score for generic contacts
};

function getJobTitleScore(title) {
  if (!title) return 0;
  const lowerTitle = title.toLowerCase();
  for (const keyword in jobTitleHierarchy) {
    if (lowerTitle.includes(keyword)) {
      return jobTitleHierarchy[keyword];
    }
  }
  return 0; // Default to lowest score if no keyword matches
}

// ---------- UTILITY FUNCTIONS ----------
function loadLeads() {
  if (!fs.existsSync(CONFIG.dataFile)) {
    fs.writeFileSync(CONFIG.dataFile, JSON.stringify([], null, 2));
    return [];
  }
  try {
    const data = fs.readFileSync(CONFIG.dataFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading or parsing leads.json:', error);
    // If the file is corrupted, back it up and start with a fresh one
    fs.renameSync(CONFIG.dataFile, `${CONFIG.dataFile}.bak`);
    fs.writeFileSync(CONFIG.dataFile, JSON.stringify([], null, 2));
    return [];
  }
}

function saveLeads(leads) {
  fs.writeFileSync(CONFIG.dataFile, JSON.stringify(leads, null, 2));
}

const SENT_EMAILS_FILE = path.join(__dirname, 'sent_emails.json');

function loadSentEmails() {
  if (fs.existsSync(SENT_EMAILS_FILE)) {
    const data = fs.readFileSync(SENT_EMAILS_FILE, 'utf8');
    return new Set(JSON.parse(data));
  }
  return new Set();
}

function saveSentEmails(sentEmails) {
  fs.writeFileSync(SENT_EMAILS_FILE, JSON.stringify(Array.from(sentEmails), null, 2));
}

// function saveSentLeads(sentLeads) {
//   const sentLeadsFile = path.join(__dirname, 'sent_leads.json');
//   console.log(`Moving ${sentLeads.length} completed lead(s) to ${sentLeadsFile}`);
//   let existingSentLeads = [];
//   if (fs.existsSync(sentLeadsFile)) {
//     existingSentLeads = JSON.parse(fs.readFileSync(sentLeadsFile));
//   }
//   const allSentLeads = existingSentLeads.concat(sentLeads);
//   fs.writeFileSync(sentLeadsFile, JSON.stringify(allSentLeads, null, 2));
// }

// ---------- SCRAPING ----------
async function getWebsitesByIndustry(industry, browser) {
  const allLinks = new Set();
  const tldsToSearch = shuffleArray([...CONFIG.searchTlds]).slice(0, 15);
  console.log(`Searching TLDs: ${tldsToSearch.join(', ')}`);

  for (const tld of tldsToSearch) {
  let page;

  try {
    page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
    );

    await page.setViewport({ width: 1366, height: 768 });
      // Use HTML version of DuckDuckGo and fix site search parameter
      const query = `"${industry}" contact OR about OR "${industry}" site:${tld.substring(1)}`;
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });

      // Selector for the HTML version
      const links = await page.$$eval('a.result__a', anchors =>
        anchors.map(a => a.href)
      );

      if (links.length === 0) {
        fs.writeFileSync('debug.html', await page.content());
      }

      const cleanedLinks = links.map(link => {
        try {
          const url = new URL(link);
          // The HTML version also uses a redirect with 'uddg' parameter
          if (url.hostname.includes('duckduckgo.com') && url.searchParams.has('uddg')) {
            const uddgUrl = url.searchParams.get('uddg');
            // Validate the extracted uddgUrl before returning
            new URL(uddgUrl); // Throws if invalid
            return uddgUrl;
          }
          return link;
        } catch (e) {
          // If URL is malformed, return null to filter it out later
          return null;
        }
      }).filter(link => link !== null); // Filter out nulls (malformed URLs)

      const filteredLinks = cleanedLinks.filter(link => {
        try {
            const hasIrrelevantKeyword = CONFIG.irrelevantKeywords.some(keyword => link.includes(keyword));
            return !hasIrrelevantKeyword;
        } catch (error) {
            return false;
        }
      });

      filteredLinks.forEach(link => allLinks.add(link));

    } catch (error) {
      console.error(`Could not scrape for TLD ${tld}: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }
  return [...allLinks];
}


async function extractEmailsFromWebsite(url, browser) {
  const visited = new Set();
  const scrapedEmails = new Set(); // Renamed to avoid conflict with combined emails
  const queue = [url];
  visited.add(url);

  let page;
  let initialHost = '';
  let companyName = '';
  let scrapedPeople = []; // Will store names, titles, and emails found via scraping
  let sender = null; // Will be selected from scrapedPeople
  let apolloContacts = []; // Initialize apolloContacts here

  try {
    page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
    );

    await page.setViewport({ width: 1366, height: 768 });

    const urlObj = new URL(url);
    initialHost = urlObj.hostname;
    // Remove 'www.' if present
    if (initialHost.startsWith('www.')) {
      initialHost = initialHost.substring(4);
    }
    companyName = initialHost.split('.')[0]; // Simple company name extraction

    console.log(`Starting data extraction for ${url} (Domain: ${initialHost}, Company: ${companyName})`);


    const fileExtensionsToIgnore = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.rar', '.mp3', '.mp4', 'avi', '.mov', '.wmv', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    const contactKeywords = ['contact', 'about', 'team', 'impressum'];


    while (queue.length > 0) {
      const currentUrl = queue.shift();


      if (visited.size >= CONFIG.maxPagesToVisit) {
        console.log(`Reached max pages to visit for ${url}`);
        break;
      }


      if (fileExtensionsToIgnore.some(ext => currentUrl.toLowerCase().endsWith(ext))) {
        continue;
      }


      let success = false;
      for (let i = 0; i < 5; i++) {
        try {
          await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 60000 });
          const content = await page.content();
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
          const foundEmails = content.match(emailRegex) || [];
          foundEmails.forEach(email => scrapedEmails.add(email)); // Scraped emails are added here


          const links = await page.$$eval('a', as => as.map(a => a.href));


          const internalLinks = links
            .map(link => {
              try {
                return new URL(link, currentUrl).href;
              } catch (e) {
                return null;
              }
            })
            .filter(link => {
              if (!link) return false;
              try {
                const linkUrl = new URL(link);
                return linkUrl.hostname === initialHost && !visited.has(link) && (linkUrl.protocol === 'http:' || linkUrl.protocol === 'https');
              } catch (e) {
                return false;
              }
            });


          const priorityLinks = internalLinks.filter(link => contactKeywords.some(keyword => link.toLowerCase().includes(keyword)));
          const otherLinks = internalLinks.filter(link => !contactKeywords.some(keyword => link.toLowerCase().includes(keyword)));


          const linksToQueue = [...priorityLinks, ...otherLinks];


          for (const link of linksToQueue) {
            if (visited.size >= CONFIG.maxPagesToVisit) break;
            if (!visited.has(link)) {
              visited.add(link);
              if (priorityLinks.includes(link)) {
                queue.unshift(link); // Add priority links to the front
              } else {
                queue.push(link);
              }
            }
          }
          success = true;
          break;
        } catch (err) {
          const isRetryableError = err.name === 'TimeoutError' || 
            err.message.includes('net::ERR_CONNECTION_TIMED_OUT') || 
            err.message.includes('net::ERR_NAME_NOT_RESOLVED') || 
            err.message.includes('net::ERR_CONNECTION_REFUSED') ||
            err.message.includes('net::ERR_CERT_DATE_INVALID') ||
            err.message.includes('net::ERR_CERT_AUTHORITY_INVALID') ||
            err.message.includes('SSL') ||
            err.message.includes('CERT');
          if (!isRetryableError) {
            console.log(`Attempt ${i + 1} failed for ${currentUrl}: ${err.message}`);
          }
          if (i === 4 && !isRetryableError) {
            console.log(`Failed to visit ${currentUrl} after 5 attempts.`);
          }
        }
      }
    }
  } catch (error) {
    if (error.name === 'TimeoutError' || 
        error.message.includes('net::ERR_CONNECTION_TIMED_OUT') || 
        error.message.includes('net::ERR_NAME_NOT_RESOLVED') ||
        error.message.includes('net::ERR_CERT_DATE_INVALID') ||
        error.message.includes('net::ERR_CERT_AUTHORITY_INVALID') ||
        error.message.includes('SSL') ||
        error.message.includes('CERT')) {
      // Silently ignore retryable errors on initial URL load
    } else {
      console.error(`An error occurred while extracting emails from ${url}:`, error);
    }
  }

//   // --- NEW SCRAPING LOGIC FOR PEOPLE DATA GOES HERE ---
  console.log(`[INFO] Starting enhanced scraping for people data on ${initialHost}...`);

const peoplePageKeywords = [
  'team','contact', 'management','about-us', 'executives', 'board',
  'staff', 'who-we-are', 'our-team', 'meet-the-team',
  'personnel', 'employees',
  'members', 'directors'
];
  const potentialPeoplePages = new Set();

  // First, try to find direct links to people pages from the initial crawl
  for (const link of visited) {
    if (peoplePageKeywords.some(keyword => link.toLowerCase().includes(keyword))) {
      potentialPeoplePages.add(link);
    }
  }

  // Next, scrape links from the current page and check for people-related keywords
  try {
    const currentLinks = await page.$$eval('a', anchors => anchors.map(a => a.href));
    for (const link of currentLinks) {
      try {
        const urlObj = new URL(link);
        if (urlObj.hostname === initialHost && peoplePageKeywords.some(keyword => urlObj.pathname.toLowerCase().includes(keyword))) {
          potentialPeoplePages.add(link);
        }
      } catch (e) {
        // Ignore invalid URLs
      }
    }
  } catch (error) {
    console.error(`Error scraping links from current page: ${error.message}`);
  }

  // If no direct links found from visited or current page, try constructing common people page URLs
  if (potentialPeoplePages.size === 0) {
    const domainParts = initialHost.split('.');
    // A bare domain typically has 2 parts (e.g., example.com) or 3 parts if it was originally www.example.com and www. was stripped.
    // If it has more than 2 parts, it likely already includes a subdomain (e.g., hr.utmb.edu).
    const isBareDomain = domainParts.length <= 2; 

    for (const keyword of peoplePageKeywords) {
      // Always try the initialHost as is
      potentialPeoplePages.add(`https://${initialHost}/${keyword}`);
      potentialPeoplePages.add(`https://${initialHost}/${keyword}/`);

      // Only try prepending 'www.' if it's a bare domain
      if (isBareDomain) {
        potentialPeoplePages.add(`https://www.${initialHost}/${keyword}`);
        potentialPeoplePages.add(`https://www.${initialHost}/${keyword}/`);
      }
    }
  }
    
// Function to validate if a string is a plausible name

  
function isValidName(name, title, irrelevantPhrases) {
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return false;
  }

  // Normalize everything to lowercase ONCE
  const normalizedName = name.toLowerCase().trim();
  const normalizedTitle = (title || '').toLowerCase().trim();

  //Check irrelevant phrases (case-insensitive)
  const isIrrelevant = irrelevantPhrases.some(phrase => {
    const p = phrase.toLowerCase();
    return normalizedName.includes(p) || normalizedTitle.includes(p);
  });

  if (isIrrelevant) return false;

  // Remove weird characters before validation
  const cleanName = name.replace(/[^a-zA-Z\s'-]/g, '');

  // Reject names with numbers
  if (/\d/.test(name)) return false;

  // Reject too short names
  const words = cleanName.split(/\s+/).filter(Boolean);
  if (words.length === 1 && words[0].length < 3) return false;

  return true;
}
  
  // Function to scrape names, titles, and emails from a given page
  async function scrapePeopleFromPage(pageUrl, browser) {
    const peopleFound = [];
    const maxRetries = 3;
    let pageInstance; // Declare pageInstance here

    try {
      pageInstance = await browser.newPage(); // Create a new page for this function call
      await pageInstance.setRequestInterception(true);

      pageInstance.on('request', (req) => {
        const type = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Add a random delay before navigating to the page
          // const delay = Math.floor(Math.random() * 3000) + 2000; // Random delay between 2 to 5 seconds
          // await new Promise(resolve => setTimeout(resolve, delay));

          try {
            await pageInstance.goto(pageUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 60000
            });
          } catch (err) {
            console.log(`Skipping slow page: ${pageUrl}, continuing anyway...`);
            return [];
          }
          const content = await pageInstance.content();

          // More aggressive approach: look for common HTML structures and patterns
          const scrapedElements = await pageInstance.$$eval('div[class*="team-member"], div[class*="person-card"], div[class*="staff-profile"], section[class*="team"], section[class*="people"], div[class*="name"], div[class*="person"], div[class*="member"], div[class*="contact"], a[href*="mailto:"], h1, h2, h3, h4, h5, h6, p, li, span', (elements, irrelevantPhrases) => {
            const results = [];
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

            // Define isValidNameInBrowser locally for the browser context
            const isValidNameInBrowser = (name, title, irrelevantPhrases) => {
              if (!name || typeof name !== 'string' || name.trim().length < 2) {
                return false;
              }

              const lowerName = name.toLowerCase().trim();
              const lowerTitle = (title || '').toLowerCase().trim();

              // Check against irrelevant phrases
              if (irrelevantPhrases.some(phrase => lowerName.includes(phrase.toLowerCase()) || lowerTitle.includes(phrase.toLowerCase()))) {
                return false;
              }

              // Exclude names that are all uppercase and short (likely acronyms or company names)
              const words = name.split(/\s+/).filter(Boolean);
              if (name === name.toUpperCase() && name.length <= 5 && words.length === 1) {
                return false;
              }

              // A name should typically have at least two words (first and last name) or be a single, longer word.
              // Refined: If it's a single word, it should be longer than 2 characters and not be a common title abbreviation.
              if (words.length === 1) {
                const singleWord = words[0];
                if (singleWord.length < 3 || ['mr', 'ms', 'dr', 'jr', 'sr'].includes(singleWord.toLowerCase())) {
                  return false;
                }
              }

              // Exclude common company indicators
              const companyIndicators = ['inc', 'ltd', 'corp', 'llc', 'group', 'solutions', 'technologies', 'company', 'co', 'gmbh', 'ag', 'sa', 'bv', 'pte', 'sarl'];
              if (companyIndicators.some(indicator => lowerName.includes(indicator))) {
                return false;
              }

              // New check: A valid name should typically start with a capital letter
              if (words.length > 0 && !/^[A-Z]/.test(words[0])) {
                  return false;
              }

              // New check: Avoid names that are just initials unless they are part of a longer name (e.g., "J D" is okay, but "J" is not)
              if (words.every(word => word.length === 1 && /^[A-Z]$/.test(word)) && words.length < 2) {
                  return false;
              }

              // --- NEW ADDITIONS FOR BETTER NAME VALIDATION ---

              // 1. Check for presence of numbers or too many special characters in the name
              // Allow apostrophes and hyphens, but limit other special characters
              if (/\d/.test(name) || (name.match(/[^a-zA-Z\s'-]/g) || []).length > 1) {
                return false;
              }

              // 2. Exclude very short names that are likely not full names (e.g., "Dr", "Mr", "CEO")
              if (words.length === 1 && name.length <= 3) {
                  return false;
              }

              // 3. Exclude names that are common single-word titles or departments
              const commonTitles = ['ceo', 'cto', 'cfo', 'cmo', 'cio', 'hr', 'sales', 'marketing', 'support', 'admin', 'manager', 'director', 'president', 'founder', 'owner', 'partner', 'head', 'lead', 'vice', 'executive', 'staff', 'team', 'contact', 'about', 'home', 'blog', 'news', 'events', 'careers', 'jobs', 'privacy', 'terms', 'legal', 'investors', 'media', 'press', 'solutions', 'products', 'services', 'company', 'group', 'inc', 'ltd', 'corp', 'llc'];
              if (words.length === 1 && commonTitles.includes(lowerName)) {
                  return false;
              }

              // 4. Ensure names have at least two distinct parts (first and last name) unless it's a known single name
              // This helps filter out single words that might be company names or generic terms
              if (words.length < 2 && name.length > 3 && !['mary', 'john', 'peter', 'susan', 'david', 'lisa', 'mark', 'anna', 'paul', 'maria'].includes(lowerName)) { // Add more common single names if needed
                  // If it's a single word, it should be a proper noun (starts with capital, rest lowercase)
                  if (words.length === 1 && !/^[A-Z][a-z]+$/.test(name)) {
                      return false;
                  }
              }

              // 5. Check for names that are too long (unlikely to be a single person's name)
              if (name.length > 50) {
                  return false;
              }

              // 6. Exclude names that are just a sequence of capital letters (e.g., "ABC Company")
              if (name === name.toUpperCase() && name.length > 1 && words.length === 1) {
                  return false;
              }

              return true;
            };

            elements.forEach(el => {
              if (el.innerText && el.innerText.length > 5 && el.innerText.length < 500) {
                const text = el.innerText.trim();
                const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

                let name = '';
                let title = '';
                let email = '';

                // Find email in the text
                const emailMatch = text.match(emailRegex);
                if (emailMatch) {
                  email = emailMatch[0];

                  // Try different patterns to extract name and title
                  // Prioritize mailto links
                  if (el.tagName === 'A' && el.href.startsWith('mailto:')) {
                    name = el.innerText.replace(emailRegex, '').replace(/[<>\(\)\-]/g, '').trim();
                    if (!name) {
                      const mailtoNameMatch = el.href.match(/mailto:([^?]+)/);
                      if (mailtoNameMatch && mailtoNameMatch[1]) {
                        name = mailtoNameMatch[1].split('@')[0].replace(/[\._]/g, ' ').trim();
                      }
                    }
                  }

                  if (!name && lines.length >= 2) {
                    const line1 = lines[0];
                    const line2 = lines[1];

                    const nameLikeRegex = /^[A-Z][a-zA-Z\s.'-]+$/;
                    const titleLikeRegex = /^(Manager|Director|Engineer|Specialist|Lead|Head|Officer|VP|President|Founder|CEO|CTO|CFO|CMO|CIO|COO|HR|Sales|Marketing|Software|Data|Product|Project|Business|Senior|Junior|Associate|Analyst|Consultant|Developer|Designer|Architect|Scientist|Research|Operations|Customer|Support|Client|Account|Finance|Legal|Admin|Executive|Assistant|Coordinator|Specialist|Representative|Recruiter|Talent|People|Office|Facilities|Event|Public Relations|Social Media|Content|Writer|Photographer|Videographer|Graphic|Web|Investment|Portfolio|Wealth|Financial|Insurance|Real Estate|Broker|Trader|Underwriter|Claims|Actuary|Co-founder|Chief of Staff|General Manager|Program Manager|Regional Director|Area Director|Country Director|Global Director|Section Head|Group Leader|Team Leader|Supervisor|Foreman|Student|Volunteer)\b/i;

                    if (nameLikeRegex.test(line1) && titleLikeRegex.test(line2)) {
                      name = line1;
                      title = line2;
                    } else if (nameLikeRegex.test(line2) && titleLikeRegex.test(line1)) {
                      name = line2;
                      title = line1;
                    } else if (!emailRegex.test(line1) && line1.length > 3 && line1.split(' ').length <= 4) {
                      name = line1;
                      if (!emailRegex.test(line2) && line2.length > 3 && line2.split(' ').length <= 5) {
                         title = line2;
                      }
                    }
                  }

                  if (!name && lines.length === 1) {
                    name = lines[0].replace(emailRegex, '').replace(/[<>\(\)\-]/g, '').trim();
                  }

                  // Fallback: try to extract name from email if not found yet
                  if (!name && email) {
                    const emailUser = email.split('@')[0];
                    const emailParts = emailUser.split(/[\._-]/); // Split by '.', '_', or '-'
                    if (emailParts.length >= 2) {
                      name = emailParts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
                    } else if (emailParts.length === 1) {
                      name = emailParts[0].replace(/[\d]/g, '').trim(); // Remove numbers
                      if (name.length > 1 && name.length < 20) {
                         name = name.charAt(0).toUpperCase() + name.slice(1);
                      } else {
                         name = '';
                      }
                    }
                  }

                  // Clean up name and title
                  if (name) name = name.replace(/[^a-zA-Z\s.'-]+/g, '').trim();
                  if (title) title = title.replace(/[^a-zA-Z\s.'-]+/g, '').trim();

                  // Additional patterns for name-email combinations
                  const patterns = [
                    /([A-Za-z\s]+)\s*<[^>]*>/g, // Name <...>
                    /\([^)]+\)\s*([A-Za-z\s]+)/g, // (...) Name
                    /([A-Za-z\s]+)\s*-\s*[^@]+@/g, // Name - ...@
                  ];
                  patterns.forEach(pattern => {
                    const match = text.match(pattern);
                    if (match) {
                      const extracted = match[0].replace(emailRegex, '').replace(/[<>\(\)\-]/g, '').trim();
                      if (extracted && !name) name = extracted;
                    }
                  });

                  // Validate and add
                  if (isValidNameInBrowser(name, title, irrelevantPhrases)) {
                    results.push({ name, title, email });
                  }
                }
              }
            });

            // Additional global search for specific patterns across the page
            const bodyText = document.body.innerText;
            const globalPatterns = [
              /([A-Za-z\s]+)\s*<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/g, // Name <email>
              /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*\(([^)]+)\)/g, // email (name)
              /([A-Za-z\s]+)\s*-\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, // Name - email
            ];
            globalPatterns.forEach(pattern => {
              let match;
              while ((match = pattern.exec(bodyText)) !== null) {
                const name = match[1] || match[2];
                const email = match[2] || match[1];
                if (name && email && isValidNameInBrowser(name, '', irrelevantPhrases)) {
                  results.push({ name, title: '', email });
                }
              }
            });

            return results;
          }, CONFIG.irrelevantPhrases);

          scrapedElements.forEach(person => {
            if (person.name && person.email) {
              peopleFound.push(person);
            }
          });
          return peopleFound; // Success, return the results
        } catch (error) {
          console.error(`Error scraping people from ${pageUrl} (attempt ${attempt}/${maxRetries}):`, error.message);
          if (attempt === maxRetries) {
            return []; // Return empty array after all retries
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    } finally {
      if (pageInstance && !pageInstance.isClosed()) {
        await pageInstance.close(); // Ensure the page is closed
      }
    }
    return peopleFound; // Return peopleFound outside the try-finally
  }

  // Visit potential people pages and scrape concurrently
  const peoplePageUrlsToScrape = Array.from(potentialPeoplePages).filter(url => !visited.has(url));
  const limit = CONFIG.peoplePageConcurrency;
  let activePromises = 0;
  let urlIndex = 0;

  while (urlIndex < peoplePageUrlsToScrape.length || activePromises > 0) {
    while (activePromises < limit && urlIndex < peoplePageUrlsToScrape.length) {
      const peoplePageUrl = peoplePageUrlsToScrape[urlIndex++];
      if (scrapedPeople.length >= CONFIG.maxPeopleToScrape) {
        console.log(`Reached max people to scrape (${CONFIG.maxPeopleToScrape}). Stopping.`);
        break;
      }

      console.log(`[INFO] Visiting potential people page: ${peoplePageUrl}`);
      const promise = scrapePeopleFromPage(peoplePageUrl, browser)
        .then(peopleOnPage => {
          peopleOnPage.forEach(person => {
            if (scrapedPeople.length < CONFIG.maxPeopleToScrape) {
              scrapedPeople.push(person);
              scrapedEmails.add(person.email);
            }
          });
        })
        .catch(error => {
          console.error(`Error scraping people from ${peoplePageUrl} in concurrent task:`, error);
        })
        .finally(() => {
          activePromises--;
        });
      activePromises++;
    }
    // Wait for at least one promise to settle if there are active promises
    if (activePromises > 0) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to prevent busy-waiting
    }
    if (scrapedPeople.length >= CONFIG.maxPeopleToScrape) {
      break;
    }
  }
  

  // Apply "Least Position" Logic to Scraped Data
  if (scrapedPeople.length > 0) {
    // Sort people by job title score in ascending order (least position first)
    scrapedPeople.sort((a, b) => getJobTitleScore(a.title) - getJobTitleScore(b.title));

    // Select the person with the least position as the sender
    sender = {
      first_name: scrapedPeople[0].name.split(' ')[0] || 'Team',
      last_name: scrapedPeople[0].name.split(' ').slice(1).join(' ') || 'Member',
      email: scrapedPeople[0].email,
      title: scrapedPeople[0].title
    };
    console.log(`[INFO] Selected sender: ${sender.first_name} ${sender.last_name} (${sender.title}) - ${sender.email}`);
  } else {
    // Fallback: if no specific people were scraped, set sender to null
    sender = null;
    console.log(`[INFO] No specific people scraped. Setting sender to null.`);
  }

  return { emails: Array.from(scrapedEmails), domain: initialHost, companyName, scrapedPeople, sender };
 
  // Add this line at the very end of the function
  if (page && !page.isClosed()) {
    await page.close();

}

}



// ---------- MAIN BOT ----------
async function main(io) {
  if (!emailQueueProcessorInterval) {
    emailQueueProcessorInterval = setInterval(emailQueueProcessor, 2 * 60 * 1000); // Run every 2 minutes
  }

  let browser = await puppeteer.launch({
    headless: "new",
    ignoreHTTPSErrors: true, // Add this line
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--ignore-certificate-errors-spki-list',
      '--ignore-ssl-errors-ignore-untrusted',
      '--disable-blink-features=AutomationControlled'
    ],
    protocolTimeout: 90000, // Increase timeout for stealth plugin
  });

  // Start email queue processor
  emailQueueProcessor(); // Run once immediately
  setInterval(emailQueueProcessor, 300000); // Then every 5 minutes
  console.log('[INFO] Email queue processor started, running every 5 minutes.');

  while (true) {
    try {
      const leads = loadLeads();
      console.log(`Loaded ${leads.length} existing leads.`); // Added log
      const shuffledIndustries = shuffleArray([...CONFIG.industries]);

      for (const industry of shuffledIndustries) {
        console.log(`\nSearching websites for industry: ${industry}`);

        const websites = await getWebsitesByIndustry(industry, browser);
        console.log(`Found ${websites.length} websites for industry ${industry}.`); // Added log

        for (const website of websites) {
          if (leads.some(l => l.website === website)) {
            console.log(`Skipping already processed website: ${website}`);
            continue;
          }

          const { emails, domain, companyName, scrapedPeople, sender } = await extractEmailsFromWebsite(website, browser);
          // A lead is valid if we found any emails (scraped or Apollo) or Apollo contacts
          if (emails.length > 0 || scrapedPeople.length > 0) {
            const lead = {
              website,
              domain, // Store the extracted domain
              companyName, // Store the extracted company name
              emails, // Emails found via scraping and Apollo (excluding sender)
              scrapedPeople, // All relevant Apollo contacts
              sender, // The selected sender contact from Apollo
              industry,
              timestamp: new Date().toISOString(),
              emailsSent: false,
              sentEmailLinks: [],
            };
            leads.push(lead);
            saveLeads(leads);
            console.log(`Saved new lead for ${website}. Total leads: ${leads.length}`); // Added log
            io.emit('new-lead', lead);
          } else {
            console.log(`No emails found for ${website}.`); // Added log
        } // Closing brace for 'for (const website of websites)' loop
      } // <--- ADDED: Closing brace for 'for (const industry of shuffledIndustries)' loop

      console.log('\nFinished scraping all industries. Restarting in a bit...');
      if (io) { // Only emit if io is defined
        io.emit('bot-status', { message: 'Finished scraping all industries. Restarting in a bit...' });
      }
      await wait(10000);
     } // Wait for 10 seconds before the next big loop
    } catch (error) {
      console.error('A critical error occurred in the main loop:', error);
      if (io) { // Only emit if io is defined
        io.emit('bot-error', { message: error.message });
      }
      if (browser) await browser.close();
      console.log('Restarting browser and continuing...');
      browser = await puppeteer.launch({
        headless: "new", // Changed to "new" as per deprecation warning
        ignoreHTTPSErrors: true, // Add this line
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--ignore-certificate-errors',
          '--ignore-ssl-errors',
          '--ignore-certificate-errors-spki-list',
          '--ignore-ssl-errors-ignore-untrusted',
          '--disable-blink-features=AutomationControlled'

          
        ],
        protocolTimeout: 90000, // Increase timeout for stealth plugin
      });
    }
  }
  }

  
module.exports = { main };

if (require.main === module) {
  main();
}