export interface RechargeCode {
  code: string; // 4 numeric digits e.g. "5824"
  amount: number; // 500
  createdAt: number;
  used: boolean;
  usedAt?: number;
}

const STORAGE_KEY = 'm2mfly_recharge_codes';

// Initial pre-seeded 4-digit codes available for the administrator to send immediately
const INITIAL_CODES: RechargeCode[] = [
  {
    code: '5824',
    amount: 500,
    createdAt: Date.now() - 1000 * 60 * 10,
    used: false,
  },
  {
    code: '9137',
    amount: 500,
    createdAt: Date.now() - 1000 * 60 * 5,
    used: false,
  },
  {
    code: '4028',
    amount: 500,
    createdAt: Date.now() - 1000 * 60 * 2,
    used: false,
  },
];

export function getRechargeCodes(): RechargeCode[] {
  if (typeof window === 'undefined') return INITIAL_CODES;

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CODES));
      return INITIAL_CODES;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CODES));
    return INITIAL_CODES;
  } catch {
    return INITIAL_CODES;
  }
}

export function saveRechargeCodes(codes: RechargeCode[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Generates a unique 4-digit numeric code
 */
export function generate4DigitCode(): string {
  // Generate random integer between 1000 and 9999
  const num = Math.floor(1000 + Math.random() * 9000);
  return num.toString();
}

/**
 * Creates a new code in the admin store
 */
export function createRechargeCode(customCode?: string, amount = 500): RechargeCode {
  const codes = getRechargeCodes();

  let codeStr = customCode?.trim();
  if (!codeStr || !/^\d{4}$/.test(codeStr)) {
    // Generate until unique
    do {
      codeStr = generate4DigitCode();
    } while (codes.some((c) => c.code === codeStr && !c.used));
  }

  const newEntry: RechargeCode = {
    code: codeStr,
    amount,
    createdAt: Date.now(),
    used: false,
  };

  // Add at top
  const updated = [newEntry, ...codes.filter((c) => c.code !== codeStr)];
  saveRechargeCodes(updated);
  return newEntry;
}

/**
 * Validates and consumes a 4-digit code to recharge balance
 */
export function redeemRechargeCode(inputCode: string): {
  success: boolean;
  message: string;
  amount?: number;
} {
  const cleanCode = inputCode.trim();

  if (!/^\d{4}$/.test(cleanCode)) {
    return {
      success: false,
      message: 'O código deve conter exatamente 4 dígitos numéricos.',
    };
  }

  const codes = getRechargeCodes();
  const index = codes.findIndex((c) => c.code === cleanCode);

  if (index === -1) {
    return {
      success: false,
      message: 'Código de 4 dígitos não encontrado ou inválido.',
    };
  }

  const target = codes[index];

  if (target.used) {
    const formattedDate = target.usedAt
      ? new Date(target.usedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '';
    return {
      success: false,
      message: `Este código já foi utilizado anteriormente${formattedDate ? ` às ${formattedDate}` : ''}. Solicite um novo código ao administrador.`,
    };
  }

  // Mark as used
  codes[index] = {
    ...target,
    used: true,
    usedAt: Date.now(),
  };
  saveRechargeCodes(codes);

  return {
    success: true,
    message: `Recarga de R$ ${target.amount.toFixed(2)} aplicada com sucesso!`,
    amount: target.amount,
  };
}

/**
 * Deletes a code from the list (admin only)
 */
export function deleteRechargeCode(codeToDelete: string): void {
  const codes = getRechargeCodes();
  const updated = codes.filter((c) => c.code !== codeToDelete);
  saveRechargeCodes(updated);
}
