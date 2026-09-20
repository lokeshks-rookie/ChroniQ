import { useState, useEffect } from 'react';

export type SupportedLanguage = 'en' | 'ta' | 'hi';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
];

/**
 * In-house multilingual dictionary for ChroniQ Special Screens (Display & Kiosk).
 * Tamil & Hindi translations written in plain, natural conversational phrasing.
 * Listed in final report as "needs native-speaker review".
 */
export const I18N_DICTIONARY: Record<string, Record<SupportedLanguage, string>> = {
  // Common / Navigation / Chrome
  'common.all_departments': {
    en: 'All Departments',
    ta: 'அனைத்து பிரிவுகள்',
    hi: 'सभी विभाग',
  },
  'common.hospital': {
    en: 'Hospital',
    ta: 'மருத்துவமனை',
    hi: 'अस्पताल',
  },
  'common.room': {
    en: 'Room',
    ta: 'அறை',
    hi: 'कमरा',
  },
  'common.live': {
    en: 'Live',
    ta: 'நேரலை',
    hi: 'सक्रिय',
  },
  'common.offline': {
    en: 'Offline',
    ta: 'இணைப்பில் இல்லை',
    hi: 'ऑफ़लाइन',
  },
  'common.last_update': {
    en: 'Last update',
    ta: 'கடைசி புதுப்பிப்பு',
    hi: 'अंतिम अपडेट',
  },
  'common.need_help': {
    en: 'Need help?',
    ta: 'உதவி தேவையா?',
    hi: 'मदद चाहिए?',
  },
  'common.close': {
    en: 'Close',
    ta: 'மூடுக',
    hi: 'बंद करें',
  },
  'common.back': {
    en: 'Back',
    ta: 'பின்செல்க',
    hi: 'पीछे जाएं',
  },
  'common.done': {
    en: 'Done',
    ta: 'முடிந்தது',
    hi: 'पूर्ण',
  },
  'common.retry': {
    en: 'Try again',
    ta: 'மீண்டும் முயற்சிக்கவும்',
    hi: 'पुनः प्रयास करें',
  },

  // Display Board (Page 48)
  'display.now_serving': {
    en: 'NOW SERVING',
    ta: 'தற்போது அழைக்கப்படுபவர்',
    hi: 'वर्तमान में सेवारत',
  },
  'display.next_in_line': {
    en: 'NEXT IN LINE',
    ta: 'அடுத்து வரிசையில் உள்ளவர்கள்',
    hi: 'अगली कतार में',
  },
  'display.notices': {
    en: 'NOTICES',
    ta: 'முக்கிய அறிவிப்புகள்',
    hi: 'महत्वपूर्ण सूचनाएं',
  },
  'display.now_calling': {
    en: 'Now calling',
    ta: 'இப்போது அழைக்கப்படுகிறார்',
    hi: 'अब बुलाया जा रहा है',
  },
  'display.proceed_to': {
    en: 'Please proceed to Room',
    ta: 'தயவுசெய்து அறைக்குச் செல்லவும்',
    hi: 'कृपया कमरे में जाएं',
  },
  'display.second_call': {
    en: 'Second call: Please proceed to Room',
    ta: 'இரண்டாவது அழைப்பு: அறைக்குச் செல்லவும்',
    hi: 'दूसरा बुलावा: कृपया कमरे में जाएं',
  },
  'display.on_break_until': {
    en: 'On break until',
    ta: 'இடைவேளையில் உள்ளார் - திரும்பும் நேரம்',
    hi: 'विश्राम पर - वापसी समय',
  },
  'display.running_late': {
    en: 'Running about {min} min late',
    ta: 'சுமார் {min} நிமிடம் தாமதமாக உள்ளார்',
    hi: 'लगभग {min} मिनट की देरी',
  },
  'display.not_available_today': {
    en: 'Not available today',
    ta: 'இன்று பணியில் இல்லை',
    hi: 'आज उपलब्ध नहीं हैं',
  },
  'display.no_patients_waiting': {
    en: 'No patients waiting',
    ta: 'நோயாளிகள் காத்திருக்கவில்லை',
    hi: 'कोई मरीज प्रतीक्षा में नहीं है',
  },
  'display.more_waiting': {
    en: '+{count} more waiting',
    ta: 'மேலும் +{count} பேர் காத்திருக்கின்றனர்',
    hi: '+{count} और मरीज प्रतीक्षा में हैं',
  },
  'display.default_notice': {
    en: 'Please keep your token slip and watch this screen for your turn.',
    ta: 'உங்கள் டோக்கன் ரசீதை வைத்திருக்கவும், உங்கள் முறை வரும் வரை இந்தத் திரையைப் பார்க்கவும்.',
    hi: 'कृपया अपनी टोकन पर्ची पास रखें और अपनी बारी के लिए इस स्क्रीन को देखें।',
  },
  'display.track_phone': {
    en: 'Track your token on your phone',
    ta: 'உங்கள் டோக்கனை போனில் கண்காணிக்கவும்',
    hi: 'अपने फोन पर टोकन ट्रैक करें',
  },
  'display.start_overlay_title': {
    en: 'Waiting Hall Display Board',
    ta: 'காத்திருப்பு மண்டபத் தகவல் பலகை',
    hi: 'प्रतीक्षा कक्ष सूचना पट्ट',
  },
  'display.start_overlay_desc': {
    en: 'Tap anywhere to start live display, enable voice announcements, and enter fullscreen.',
    ta: 'நேரலை காட்சி மற்றும் குரல் அறிவிப்புகளைத் தொடங்க எங்கு வேண்டுமானாலும் தொடவும்.',
    hi: 'लाइव प्रदर्शन और ध्वनि घोषणाएं शुरू करने के लिए कहीं भी स्पर्श करें।',
  },
  'display.start_btn': {
    en: 'Start display',
    ta: 'திரையைத் தொடங்கு',
    hi: 'शुरू करें',
  },
  'display.settings_title': {
    en: 'Display Settings',
    ta: 'திரை அமைப்புகள்',
    hi: 'स्क्रीन सेटिंग्स',
  },
  'display.sound_toggle': {
    en: 'Voice announcements',
    ta: 'குரல் அறிவிப்புகள்',
    hi: 'आवाज घोषणाएं',
  },
  'display.volume': {
    en: 'Volume',
    ta: 'ஒலி அளவு',
    hi: 'ध्वनि स्तर',
  },
  'display.language': {
    en: 'Announcement language',
    ta: 'அறிவிப்பு மொழி',
    hi: 'घोषणा की भाषा',
  },
  'display.text_size': {
    en: 'Text size',
    ta: 'எழுத்து அளவு',
    hi: 'अक्षर का आकार',
  },
  'display.test_speech': {
    en: 'Test announcement',
    ta: 'குரல் சோதனை',
    hi: 'घोषणा परीक्षण',
  },
  'display.fullscreen': {
    en: 'Toggle fullscreen',
    ta: 'முழுத்திரை',
    hi: 'पूर्ण स्क्रीन',
  },
  'display.under_5_min': {
    en: 'under 5 min',
    ta: '5 நிமிடத்திற்குள்',
    hi: '5 मिनट से कम',
  },
  'display.about_min': {
    en: 'about {min} min',
    ta: 'சுமார் {min} நிமிடம்',
    hi: 'लगभग {min} मिनट',
  },

  // Kiosk Check-In (Page 49)
  'kiosk.welcome_title': {
    en: 'Self Check-in Kiosk',
    ta: 'சுய பதிவு மையம்',
    hi: 'स्वयं चेक-इन कियोस्क',
  },
  'kiosk.welcome_subtitle': {
    en: 'Touch a card below to check in or register for a walk-in consultation.',
    ta: 'மருத்துவ ஆலோசனைக்கான பதிவை மேற்கொள்ள கீழே தொடவும்.',
    hi: 'परामर्श के लिए चेक-इन या नया टोकन लेने हेतु नीचे स्पर्श करें।',
  },
  'kiosk.has_appointment_title': {
    en: 'I have an appointment',
    ta: 'முன்பதிவு செய்துள்ளேன்',
    hi: 'मेरी पहले से अपॉइंटमेंट है',
  },
  'kiosk.has_appointment_desc': {
    en: 'Check in with mobile number or scan appointment QR',
    ta: 'மொபைல் எண் அல்லது QR குறியீடு மூலம் பதிவு செய்யவும்',
    hi: 'मोबाइल नंबर या QR कोड से चेक-इन करें',
  },
  'kiosk.no_appointment_title': {
    en: "I don't have an appointment",
    ta: 'முன்பதிவு செய்யவில்லை',
    hi: 'मेरे पास अपॉइंटमेंट नहीं है',
  },
  'kiosk.no_appointment_desc': {
    en: 'Get a walk-in token for available doctors today',
    ta: 'இன்றைய மருத்துவர்களுக்கான நேரடி டோக்கன் பெறவும்',
    hi: 'आज उपलब्ध डॉक्टर के लिए नया टोकन प्राप्त करें',
  },
  'kiosk.walk_in_disabled_desc': {
    en: 'Walk-in registrations are currently available at the front desk.',
    ta: 'நேரடி பதிவுகளுக்கு வரவேற்பு மேசையை அணுகவும்.',
    hi: 'सीधे पंजीकरण के लिए कृपया रिसेप्शन काउंटर पर जाएं।',
  },
  'kiosk.emergency_banner': {
    en: 'In an emergency, go straight to the Emergency entrance or alert staff immediately.',
    ta: 'அவசர சிகிச்சை தேவைப்பட்டால் உடனடியாக அவசர சிகிச்சைப் பிரிவை அணுகவும்.',
    hi: 'आपातकालीन स्थिति में तुरंत आपातकालीन वार्ड में जाएं या कर्मचारियों को सूचित करें।',
  },
  'kiosk.find_by_phone': {
    en: 'Phone number',
    ta: 'மொபைல் எண்',
    hi: 'मोबाइल नंबर',
  },
  'kiosk.find_by_qr': {
    en: 'Scan QR code',
    ta: 'QR ஸ்கேன்',
    hi: 'QR स्कैन',
  },
  'kiosk.phone_placeholder': {
    en: 'Enter 10-digit mobile number',
    ta: '10 இலக்க மொபைல் எண்',
    hi: '10 अंकों का मोबाइल नंबर दर्ज करें',
  },
  'kiosk.scan_instructions': {
    en: 'Hold your booking QR code in front of the scanner',
    ta: 'உங்கள் முன்பதிவு QR குறியீட்டை ஸ்கேனரின் முன் காட்டவும்',
    hi: 'अपना बुकिंग QR कोड स्कैनर के सामने रखें',
  },
  'kiosk.simulate_scan_btn': {
    en: 'Simulate scan',
    ta: 'மாதிரி ஸ்கேன் செய்',
    hi: 'स्कैन सिमुलेट करें',
  },
  'kiosk.select_appointment': {
    en: 'Select your appointment',
    ta: 'உங்கள் முன்பதிவைத் தேர்ந்தெடுக்கவும்',
    hi: 'अपनी अपॉइंटमेंट चुनें',
  },
  'kiosk.confirm_checkin': {
    en: 'Confirm check-in',
    ta: 'பதிவை உறுதிப்படுத்தவும்',
    hi: 'चेक-इन की पुष्टि करें',
  },
  'kiosk.check_in_btn': {
    en: 'Check in now',
    ta: 'இப்போது பதிவு செய்',
    hi: 'चेक-इन करें',
  },
  'kiosk.token_ready': {
    en: 'You are checked in!',
    ta: 'பதிவு வெற்றிகரமாக முடிந்தது!',
    hi: 'चेक-इन सफलतापूर्वक संपन्न हुआ!',
  },
  'kiosk.token_instructions': {
    en: 'Please take your token slip, proceed to the waiting hall, and watch the display board.',
    ta: 'உங்கள் டோக்கன் ரசீதைப் பெற்றுக்கொண்டு காத்திருப்பு அறைக்குச் செல்லவும்.',
    hi: 'कृपया अपनी टोकन पर्ची लें, प्रतीक्षालय में जाएं और स्क्रीन को देखें।',
  },
  'kiosk.print_slip': {
    en: 'Print slip',
    ta: 'ரசீது அச்சிடு',
    hi: 'पर्ची प्रिंट करें',
  },
  'kiosk.finish': {
    en: 'Done',
    ta: 'முடிந்தது',
    hi: 'समाप्त',
  },
  'kiosk.auto_return_notice': {
    en: 'Returning to welcome screen in {sec}s...',
    ta: '{sec} நொடிகளில் முதன்மைப் பக்கத்திற்குத் திரும்பும்...',
    hi: '{sec} सेकंड में होम स्क्रीन पर वापसी...',
  },
  'kiosk.idle_title': {
    en: 'Are you still there?',
    ta: 'பயன்பாட்டில் உள்ளீர்களா?',
    hi: 'क्या आप अभी भी यहां हैं?',
  },
  'kiosk.idle_desc': {
    en: 'Session will reset for privacy in {sec} seconds.',
    ta: 'பாதுகாப்பு கருதி இன்னும் {sec} வினாடிகளில் அமர்வு மீட்டமைக்கப்படும்.',
    hi: 'गोपनीयता के लिए सत्र {sec} सेकंड में समाप्त हो जाएगा।',
  },
  'kiosk.continue_session': {
    en: 'Continue session',
    ta: 'தொடரவும்',
    hi: 'जारी रखें',
  },
  'kiosk.help_modal_title': {
    en: 'Need Assistance?',
    ta: 'உதவி தேவையா?',
    hi: 'सहायता चाहिए?',
  },
  'kiosk.help_modal_desc': {
    en: 'Please approach the hospital reception desk. Our staff are available to help you check in.',
    ta: 'மருத்துவமனை வரவேற்பு மேசையை அணுகவும். எங்கள் பணியாளர்கள் உங்களுக்கு உதவத் தயாராக உள்ளனர்.',
    hi: 'कृपया अस्पताल के स्वागत काउंटर (रिसेप्शन) पर जाएं। हमारे कर्मचारी आपकी सहायता करेंगे।',
  },

  // Eligibility Messages (Table in Section 5)
  'eligibility.too_early': {
    en: 'Check-in opens at {time} (60 minutes before your slot).',
    ta: 'பதிவு நேரம் {time} மணிக்குத் தொடங்கும் (நேரத்திற்கு 60 நிமிடங்களுக்கு முன்).',
    hi: 'चेक-इन {time} बजे खुलेगा (आपके समय से 60 मिनट पहले)।',
  },
  'eligibility.late': {
    en: 'You are {min} minutes past your slot. You will be seen after patients who are already waiting.',
    ta: 'நீங்கள் {min} நிமிடங்கள் தாமதமாக வந்துள்ளீர்கள். ஏற்கனவே காத்திருக்கும் நோயாளிகளுக்குப் பிறகு அழைக்கப்படுவீர்கள்.',
    hi: 'आप अपने समय से {min} मिनट लेट हैं। आपका नंबर पहले से मौजूद मरीजों के बाद आएगा।',
  },
  'eligibility.already_checked_in': {
    en: 'You are already checked in. Here is your token details.',
    ta: 'நீங்கள் ஏற்கனவே பதிவு செய்துள்ளீர்கள். இதோ உங்கள் டோக்கன் விவரங்கள்.',
    hi: 'आप पहले ही चेक-इन कर चुके हैं। यह रहा आपका टोकन।',
  },
  'eligibility.cancelled': {
    en: 'This appointment was cancelled. Please ask the front desk for assistance.',
    ta: 'இந்த முன்பதிவு ரத்து செய்யப்பட்டுள்ளது. வரவேற்பு மேசையை அணுகவும்.',
    hi: 'यह अपॉइंटमेंट रद्द कर दी गई थी। कृपया रिसेप्शन से संपर्क करें।',
  },
  'eligibility.wrong_day': {
    en: 'This appointment is on {day} at {time}.',
    ta: 'உங்கள் முன்பதிவு {day} அன்று {time} மணிக்கு உள்ளது.',
    hi: 'यह अपॉइंटमेंट {day} को {time} बजे है।',
  },
  'eligibility.not_found': {
    en: 'We could not find an appointment for this number today.',
    ta: 'இன்று இந்த எண்ணில் முன்பதிவு ஏதும் காணப்படவில்லை.',
    hi: 'आज इस नंबर पर कोई अपॉइंटमेंट नहीं मिली।',
  },
  'eligibility.get_walkin': {
    en: 'Get a walk-in token',
    ta: 'நேரடி டோக்கன் பெறுக',
    hi: 'नया टोकन प्राप्त करें',
  },

  // Walk-In Flow (Path B)
  'walkin.enter_phone': {
    en: 'Enter your phone number',
    ta: 'உங்கள் மொபைல் எண்ணை உள்ளிடவும்',
    hi: 'अपना मोबाइल नंबर दर्ज करें',
  },
  'walkin.enter_name': {
    en: 'Enter patient name',
    ta: 'நோயாளி பெயர்',
    hi: 'मरीज का नाम दर्ज करें',
  },
  'walkin.select_reason': {
    en: 'Reason for visit',
    ta: 'வருகைக்கான காரணம்',
    hi: 'आने का मुख्य कारण',
  },
  'walkin.select_dept': {
    en: 'Select Department',
    ta: 'பிரிவைத் தேர்ந்தெடுக்கவும்',
    hi: 'विभाग का चयन करें',
  },
  'walkin.no_doctor_available': {
    en: 'No doctor available right now',
    ta: 'தற்போது மருத்துவர் பணியில் இல்லை',
    hi: 'इस समय कोई डॉक्टर उपलब्ध नहीं हैं',
  },
  'walkin.est_wait': {
    en: 'Est. wait: {wait}',
    ta: 'காத்திருப்பு நேரம்: {wait}',
    hi: 'अनुमानित समय: {wait}',
  },
  'walkin.reason_fever': {
    en: 'Fever or cold',
    ta: 'காய்ச்சல் அல்லது சளி',
    hi: 'बुखार या सर्दी',
  },
  'walkin.reason_pain': {
    en: 'Pain',
    ta: 'உடல் வலி',
    hi: 'दर्द',
  },
  'walkin.reason_skin': {
    en: 'Skin problem',
    ta: 'தோல் பிரச்சனை',
    hi: 'त्वचा संबंधी समस्या',
  },
  'walkin.reason_followup': {
    en: 'Follow-up',
    ta: 'மறுபரிசோதனை',
    hi: 'फॉलो-अप',
  },
  'walkin.reason_other': {
    en: 'Other',
    ta: 'பிற காரணங்கள்',
    hi: 'अन्य',
  },
  'walkin.reason_notsure': {
    en: 'Not sure',
    ta: 'தெரியவில்லை',
    hi: 'निश्चित नहीं',
  },
};

/**
 * Translate a key into the given language with optional token interpolation.
 * Example: t('display.about_min', 'ta', { min: 15 }) -> "சுமார் 15 நிமிடம்"
 */
export function t(
  key: string,
  lang: SupportedLanguage = 'en',
  params?: Record<string, string | number>
): string {
  const entry = I18N_DICTIONARY[key];
  if (!entry) return key;

  let text = entry[lang] || entry['en'] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return text;
}

/**
 * Format digits for languages if needed, keeping numbers clean and legible
 */
export function formatNumberI18n(num: number, _lang: SupportedLanguage = 'en'): string {
  return String(num);
}

/**
 * Hook for managing current screen language
 */
export function useLang(initial: SupportedLanguage = 'en') {
  const [lang, setLang] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('chroniq_screen_lang');
    return (saved as SupportedLanguage) || initial;
  });

  const changeLang = (newLang: SupportedLanguage) => {
    setLang(newLang);
    try {
      localStorage.setItem('chroniq_screen_lang', newLang);
    } catch {
      // storage unavailable
    }
  };

  useEffect(() => {
    // Listen for storage events across tabs if needed
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'chroniq_screen_lang' && e.newValue) {
        setLang(e.newValue as SupportedLanguage);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    lang,
    setLang: changeLang,
    t: (key: string, params?: Record<string, string | number>) => t(key, lang, params),
  };
}
