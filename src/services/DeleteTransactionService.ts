import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  transactionId: string;
}

class DeleteTransactionService {
  public async execute({ transactionId }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const transaction = await transactionsRepository.find({
      id: transactionId,
    });

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    await transactionsRepository.delete(transactionId);
  }
}

export default DeleteTransactionService;
