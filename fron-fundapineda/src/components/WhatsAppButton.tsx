import { FaWhatsapp } from 'react-icons/fa6'

const WHATSAPP_URL =
  'https://api.whatsapp.com/send/?phone=584122368644&text=Hola%2C+quisiera+mas+informacion+sobre+la+fundacion&type=phone_number&app_absent=0'

export function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all"
    >
      <FaWhatsapp size={28} />
    </a>
  )
}