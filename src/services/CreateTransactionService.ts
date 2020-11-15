import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  categoryTitle?: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    categoryTitle,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const { total } = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > total) {
      throw new AppError('Insufficient founds');
    }

    let category = null;
    if (categoryTitle) {
      category = await categoriesRepository.findOne({
        where: {
          title: categoryTitle,
        },
      });

      if (!category) {
        category = categoriesRepository.create({
          title: categoryTitle,
        });

        await categoriesRepository.save(category);
      }
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category_id: category?.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
