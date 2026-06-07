import type {
  UploadProcessEvent,
  UploadProcessResult,
} from "../types/uploadProcess.types";

type UploadProcessStatus = "processing" | "complete" | "error";

type UploadProcessSubscriber = {
  controller: ReadableStreamDefaultController<Uint8Array>;
  heartbeat: ReturnType<typeof setInterval>;
};

type UploadProcess = {
  id: string;
  userId: string;
  status: UploadProcessStatus;
  createdAt: number;
  events: UploadProcessEvent[];
  subscribers: Set<UploadProcessSubscriber>;
  result?: UploadProcessResult;
};

const PROCESS_RETENTION_MS = 10 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 5_000;
const processes = new Map<string, UploadProcess>();
const encoder = new TextEncoder();

function encodeEvent(event: UploadProcessEvent): Uint8Array {
  return encoder.encode(
    `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
  );
}

function closeSubscriber(
  process: UploadProcess,
  subscriber: UploadProcessSubscriber,
): void {
  clearInterval(subscriber.heartbeat);
  process.subscribers.delete(subscriber);

  try {
    subscriber.controller.close();
  } catch {
    //? O navegador pode ter encerrado a conexao antes do servidor.
  }
}

function scheduleProcessRemoval(process: UploadProcess): void {
  const removalTimer = setTimeout(() => {
    if (processes.get(process.id) === process) {
      processes.delete(process.id);
    }
  }, PROCESS_RETENTION_MS);

  //? A limpeza nao deve manter o processo do Bun vivo durante encerramentos
  //? controlados ou testes isolados.
  removalTimer.unref();
}

export function createUploadProcess(userId: string): string {
  const id = crypto.randomUUID();

  processes.set(id, {
    id,
    userId,
    status: "processing",
    createdAt: Date.now(),
    events: [],
    subscribers: new Set(),
  });

  return id;
}

//? A verificacao de proprietario impede que um usuario autenticado acompanhe
//? o processamento iniciado por outra sessao.
export function getUploadProcessForUser(
  processId: string,
  userId: string,
): UploadProcess | null {
  const process = processes.get(processId);

  if (!process || process.userId !== userId) return null;
  return process;
}

export function publishUploadProcessEvent(
  processId: string,
  event: UploadProcessEvent,
): void {
  const process = processes.get(processId);
  if (!process) return;

  process.events.push(event);

  if (event.type === "complete") {
    process.status = "complete";
    process.result = event.result;
  } else if (event.type === "processing-error") {
    process.status = "error";
  }

  const encodedEvent = encodeEvent(event);

  for (const subscriber of process.subscribers) {
    try {
      subscriber.controller.enqueue(encodedEvent);
    } catch {
      closeSubscriber(process, subscriber);
    }
  }

  if (process.status !== "processing") {
    for (const subscriber of [...process.subscribers]) {
      closeSubscriber(process, subscriber);
    }

    scheduleProcessRemoval(process);
  }
}

export function createUploadProcessStream(
  process: UploadProcess,
): ReadableStream<Uint8Array> {
  let subscriber: UploadProcessSubscriber | null = null;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      //? Comentario SSE inicial: confirma a conexao sem disparar um evento
      //? de negocio no EventSource.
      controller.enqueue(encoder.encode(": connected\n\n"));

      //? O historico resolve a corrida entre o POST e o EventSource. Mesmo
      //? que uma consulta termine muito rapido, o navegador recebe o evento.
      for (const event of process.events) {
        controller.enqueue(encodeEvent(event));
      }

      if (process.status !== "processing") {
        controller.close();
        return;
      }

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          if (subscriber) closeSubscriber(process, subscriber);
        }
      }, HEARTBEAT_INTERVAL_MS);

      subscriber = { controller, heartbeat };
      process.subscribers.add(subscriber);
    },
    cancel() {
      if (!subscriber) return;

      clearInterval(subscriber.heartbeat);
      process.subscribers.delete(subscriber);
      subscriber = null;
    },
  });
}
