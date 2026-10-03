/**
 * Webhook do WhatsApp (Cloud API) — receptor de OBSERVAÇÃO, em https://<site>/webhook/whatsapp.
 *
 * Imprime nos logs da função o que a Meta manda e não grava nada:
 *   - `value.statuses[]` — o que aconteceu com o que foi enviado
 *     (`sent`, `delivered`, `read`, `failed`), com o `wamid` do envio;
 *   - `value.messages[]` — o que o cliente escreveu para o número.
 *     Quando ele responde a uma mensagem nossa, `context.id` traz o `wamid` dela.
 *
 * Variáveis de ambiente (painel do Netlify → Site configuration → Environment
 * variables), SEM valor padrão — sem elas a função responde 500 e diz qual falta:
 *   - WHATSAPP_WEBHOOK_VERIFY_TOKEN — texto inventado por você, repetido no painel da Meta;
 *   - WHATSAPP_APP_SECRET — "Configurações do app → Básico" na Meta. NÃO é o token de acesso.
 *
 * ⚠️ Os logs ficam nos servidores do Netlify, então o que é dado pessoal sai
 * reduzido: o telefone aparece só com os quatro últimos dígitos e o nome do
 * perfil não aparece. O texto da mensagem aparece, porque é o que se quer testar.
 *
 * Versão local equivalente: `scripts/whatsapp-webhook-receptor.ts` no repositório pet-manager.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

// ----------------------------------------------------------------------------
// O formato do que chega — só os campos lidos aqui, todos opcionais, porque o
// corpo vem de fora e nada garante a forma.
// ----------------------------------------------------------------------------

interface Erro {
  code?: number;
  title?: string;
  message?: string;
  error_data?: { details?: string };
}

interface Status {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: Erro[];
}

interface Midia {
  id?: string;
  mime_type?: string;
  caption?: string;
}

interface Mensagem {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  context?: { id?: string };
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  reaction?: { emoji?: string; message_id?: string };
  location?: { latitude?: number; longitude?: number };
  image?: Midia;
  audio?: Midia;
  video?: Midia;
  document?: Midia;
  sticker?: Midia;
  errors?: Erro[];
}

interface Valor {
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  statuses?: Status[];
  messages?: Mensagem[];
  errors?: Erro[];
}

interface Corpo {
  entry?: { id?: string; changes?: { field?: string; value?: Valor }[] }[];
}

// ----------------------------------------------------------------------------

function mascarar(telefone: string | undefined): string {
  if (telefone === undefined) return '?';
  const digitos = telefone.replace(/\D/g, '');
  return digitos.length <= 4 ? '****' : `****${digitos.slice(-4)}`;
}

function hora(timestamp: string | undefined): string {
  if (timestamp === undefined) return '??:??:??';
  return new Date(Number(timestamp) * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function descreverErros(erros: Erro[] | undefined): string {
  if (erros === undefined || erros.length === 0) return '';
  return erros
    .map((e) => ` | ✖ ${e.code ?? '?'} ${e.title ?? e.message ?? ''} ${e.error_data?.details ?? ''}`.trimEnd())
    .join('');
}

/** O que a pessoa escreveu, qualquer que seja o tipo da mensagem. */
function conteudo(m: Mensagem): string {
  switch (m.type) {
    case 'text':
      return `"${m.text?.body ?? ''}"`;
    case 'button':
      return `botão do modelo: "${m.button?.text ?? ''}"`;
    case 'interactive':
      return `escolheu: "${m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? '?'}"`;
    case 'reaction':
      return `reagiu ${m.reaction?.emoji ?? '(removeu)'} à mensagem ${m.reaction?.message_id ?? '?'}`;
    case 'location':
      return 'enviou uma localização';
    case 'image':
    case 'audio':
    case 'video':
    case 'document':
    case 'sticker': {
      const midia = m[m.type];
      const legenda = midia?.caption === undefined ? '' : ` "${midia.caption}"`;
      return `${m.type} ${midia?.mime_type ?? ''} (media id ${midia?.id ?? '?'})${legenda}`;
    }
    default:
      // Tipo desconhecido: só o tipo — o objeto inteiro pode carregar dado pessoal.
      return `tipo não tratado: ${m.type ?? '?'}`;
  }
}

function registrar(corpo: Corpo): void {
  for (const entrada of corpo.entry ?? []) {
    for (const mudanca of entrada.changes ?? []) {
      const valor = mudanca.value ?? {};
      const phoneNumberId = valor.metadata?.phone_number_id ?? '?';

      if (mudanca.field !== 'messages') {
        // Campos como `smb_message_echoes` (coexistência com o app) — só o nome, sem conteúdo.
        console.log(`• campo "${mudanca.field ?? '?'}" (phone_number_id ${phoneNumberId})`);
        continue;
      }

      for (const s of valor.statuses ?? []) {
        console.log(
          `[${hora(s.timestamp)}] STATUS ${(s.status ?? '?').toUpperCase()} → ${mascarar(s.recipient_id)}` +
            ` | phone_number_id ${phoneNumberId} | wamid ${s.id ?? '?'}` +
            descreverErros(s.errors),
        );
      }

      for (const m of valor.messages ?? []) {
        const resposta = m.context?.id === undefined ? '' : ` | em resposta a ${m.context.id}`;
        console.log(
          `[${hora(m.timestamp)}] MENSAGEM de ${mascarar(m.from)}: ${conteudo(m)}` +
            ` | phone_number_id ${phoneNumberId} | wamid ${m.id ?? '?'}` +
            resposta +
            descreverErros(m.errors),
        );
      }

      if (valor.errors !== undefined) console.log(`• erro no nível da conta${descreverErros(valor.errors)}`);
    }
  }
}

/**
 * A assinatura é conferida sobre os BYTES recebidos, antes de qualquer
 * `JSON.parse`: re-serializar o JSON muda espaços e ordem, e o HMAC deixa de bater.
 */
function assinaturaConfere(segredo: string, corpo: Buffer, cabecalho: string | null): boolean {
  if (cabecalho === null || !cabecalho.startsWith('sha256=')) return false;
  const recebida = Buffer.from(cabecalho.slice('sha256='.length), 'hex');
  const esperada = createHmac('sha256', segredo).update(corpo).digest();
  return recebida.length === esperada.length && timingSafeEqual(recebida, esperada);
}

export default async (req: Request): Promise<Response> => {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!verifyToken || !appSecret) {
    const falta = [
      verifyToken ? null : 'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
      appSecret ? null : 'WHATSAPP_APP_SECRET',
    ].filter((nome) => nome !== null);
    console.error(`✖ falta configurar no Netlify: ${falta.join(', ')}`);
    return new Response('webhook não configurado', { status: 500 });
  }

  // A Meta confere a URL com um GET antes de mandar qualquer evento.
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const desafio = url.searchParams.get('hub.challenge');
    if (
      url.searchParams.get('hub.mode') === 'subscribe' &&
      url.searchParams.get('hub.verify_token') === verifyToken &&
      desafio !== null
    ) {
      console.log('✔ a Meta conferiu a URL — o webhook está registrado');
      return new Response(desafio, { status: 200, headers: { 'content-type': 'text/plain' } });
    }
    console.log('✖ conferência de URL recusada — o verify token do painel é o mesmo daqui?');
    return new Response('', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('', { status: 405 });

  const corpo = Buffer.from(await req.arrayBuffer());
  if (!assinaturaConfere(appSecret, corpo, req.headers.get('x-hub-signature-256'))) {
    console.log('✖ evento recusado: a assinatura não confere — o WHATSAPP_APP_SECRET é o App Secret (e não o token de acesso)?');
    return new Response('', { status: 401 });
  }

  /**
   * ⚠️ Registra ANTES de responder, ao contrário da versão local: numa função
   * serverless, o que vem depois do `return` pode não rodar. Imprimir é rápido,
   * e a Meta continua recebendo o 200 bem dentro do prazo.
   */
  try {
    registrar(JSON.parse(corpo.toString('utf8')) as Corpo);
  } catch {
    console.log('✖ assinatura válida, mas o corpo não é JSON');
  }
  return new Response('', { status: 200 });
};

export const config = { path: '/webhook/whatsapp' };
