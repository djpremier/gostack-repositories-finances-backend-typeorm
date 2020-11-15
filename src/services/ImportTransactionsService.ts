import csvParse from 'csv-parse';
import path from 'path';
import fs from 'fs';
import { getCustomRepository, getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  csvFilename: string;
}

interface CsvTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ csvFilename }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const csvFilePath = path.join(uploadConfig.directory, csvFilename);

    const readCsvStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCsv = readCsvStream.pipe(parseStream);

    const transactions: CsvTransaction[] = [];
    const categories: string[] = [];
    parseCsv.on('data', async line => {
      const [title, type, value, category] = line;

      if (!title || !type || !value) {
        return;
      }

      categories.push(category);

      transactions.push({
        title,
        type,
        value,
        category,
      });
    });

    await new Promise(resolve => {
      parseCsv.on('end', resolve);
    });

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const allCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(({ title, type, value, category }) => ({
        title,
        type,
        value,
        category: allCategories.find(
          categoryEntity => categoryEntity.title === category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(csvFilePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
