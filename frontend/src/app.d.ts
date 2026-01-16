/// <reference types="@sveltejs/kit" />

// TronLink wallet types
interface TronWeb {
	ready: boolean;
	defaultAddress: {
		base58: string;
		hex: string;
	};
	contract(): {
		at(address: string): Promise<TronContract>;
	};
	trx: {
		getBalance(address: string): Promise<number>;
		sign(transaction: unknown): Promise<unknown>;
		sendRawTransaction(transaction: unknown): Promise<unknown>;
	};
	toSun(amount: number): number;
	fromSun(amount: number): number;
}

interface TronContract {
	[key: string]: (...args: unknown[]) => {
		call(): Promise<unknown>;
		send(options?: { feeLimit?: number }): Promise<string>;
	};
}

interface TronLink {
	ready: boolean;
	request(args: { method: string }): Promise<unknown>;
	tronWeb: TronWeb;
}

declare global {
	interface Window {
		tronWeb?: TronWeb;
		tronLink?: TronLink;
	}
}

export {};
