// Especialidades médicas reconhecidas pelo CFM
// Fonte: Resolução CFM nº 2.380/2024 (Portaria CME nº 01/2024), 55 especialidades.
export const CFM_ESPECIALIDADES = [
  'Acupuntura', 'Alergia e Imunologia', 'Anestesiologia', 'Angiologia', 'Cardiologia',
  'Cirurgia Cardiovascular', 'Cirurgia da Mão', 'Cirurgia de Cabeça e Pescoço', 'Cirurgia do Aparelho Digestivo',
  'Cirurgia Geral', 'Cirurgia Oncológica', 'Cirurgia Pediátrica', 'Cirurgia Plástica', 'Cirurgia Torácica',
  'Cirurgia Vascular', 'Clínica Médica', 'Coloproctologia', 'Dermatologia', 'Endocrinologia e Metabologia',
  'Endoscopia', 'Gastroenterologia', 'Genética Médica', 'Geriatria', 'Ginecologia e Obstetrícia',
  'Hematologia e Hemoterapia', 'Homeopatia', 'Infectologia', 'Mastologia', 'Medicina de Emergência',
  'Medicina de Família e Comunidade', 'Medicina do Trabalho', 'Medicina do Tráfego', 'Medicina Esportiva',
  'Medicina Física e Reabilitação', 'Medicina Intensiva', 'Medicina Legal e Perícia Médica', 'Medicina Nuclear',
  'Medicina Preventiva e Social', 'Nefrologia', 'Neurocirurgia', 'Neurologia', 'Nutrologia', 'Oftalmologia',
  'Oncologia Clínica', 'Ortopedia e Traumatologia', 'Otorrinolaringologia', 'Patologia',
  'Patologia Clínica/Medicina Laboratorial', 'Pediatria', 'Pneumologia', 'Psiquiatria',
  'Radiologia e Diagnóstico por Imagem', 'Radioterapia', 'Reumatologia', 'Urologia',
]

export const MODALIDADES_ESP = ['RQE', 'Pós']

const KEY = 'viabilidade-medicos:especialidades-proprias'

export const norm = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export function loadCustom() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : []
  } catch {
    return []
  }
}

export function saveCustom(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* sem armazenamento disponível */
  }
}

export function catalogo(custom = loadCustom()) {
  const cfm = CFM_ESPECIALIDADES.map((nome) => ({ nome, origem: 'cfm' }))
  const proprias = custom
    .filter((n) => !CFM_ESPECIALIDADES.some((c) => norm(c) === norm(n)))
    .map((nome) => ({ nome, origem: 'propria' }))
  return [...cfm, ...proprias].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

// Encontra a especialidade do catálogo mais próxima de um nome livre (vindo do edital)
export function matchEspecialidade(nome, cat = catalogo()) {
  const n = norm(nome).replace(/^(medico|medica|medicos)\s+/, '')
  if (!n) return null
  const exact = cat.find((c) => norm(c.nome) === n)
  if (exact) return exact.nome
  const contains = cat.find((c) => n.includes(norm(c.nome)) || norm(c.nome).includes(n))
  if (contains) return contains.nome
  for (const [k, v] of Object.entries(ALIAS)) if (n.includes(k)) return v
  return null
}

// Termos usados nos editais para cada especialidade (sem acentos, minúsculas)
export const ALIAS = {

    'clinico geral': 'Clínica Médica', 'clinica geral': 'Clínica Médica', clinico: 'Clínica Médica',
    pediatra: 'Pediatria', ortopedista: 'Ortopedia e Traumatologia', ortopedia: 'Ortopedia e Traumatologia',
    ginecologista: 'Ginecologia e Obstetrícia', obstetra: 'Ginecologia e Obstetrícia', gineco: 'Ginecologia e Obstetrícia',
    cardiologista: 'Cardiologia', anestesista: 'Anestesiologia', anestesiologista: 'Anestesiologia',
    psiquiatra: 'Psiquiatria', neurologista: 'Neurologia', intensivista: 'Medicina Intensiva', uti: 'Medicina Intensiva',
    emergencista: 'Medicina de Emergência', urologista: 'Urologia', dermatologista: 'Dermatologia',
    oftalmologista: 'Oftalmologia', otorrino: 'Otorrinolaringologia', radiologista: 'Radiologia e Diagnóstico por Imagem',
    ultrassonografista: 'Radiologia e Diagnóstico por Imagem', 'cirurgiao geral': 'Cirurgia Geral',
    'medico de familia': 'Medicina de Família e Comunidade', 'saude da familia': 'Medicina de Família e Comunidade', psf: 'Medicina de Família e Comunidade',
    endocrinologista: 'Endocrinologia e Metabologia', gastroenterologista: 'Gastroenterologia', geriatra: 'Geriatria',
    infectologista: 'Infectologia', nefrologista: 'Nefrologia', pneumologista: 'Pneumologia', reumatologista: 'Reumatologia',
    mastologista: 'Mastologia', neurocirurgiao: 'Neurocirurgia', 'medico do trabalho': 'Medicina do Trabalho',
  }
