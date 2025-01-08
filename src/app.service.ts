import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import * as crypto from 'crypto';
import { Quiz } from './app.interface';

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient;
  private readonly key: Uint8Array<ArrayBuffer>;
  private readonly iv: Uint8Array<ArrayBuffer>;
  private readonly uri: string;
  private readonly logger = new Logger(AppService.name);

  constructor(private configService: ConfigService) {
    const mongoUser = this.configService.get<string>('MONGO_USER');
    const mongoPassword = this.configService.get<string>('MONGO_PASSWORD');
    const mongoCluster = this.configService.get<string>('MONGO_CLUSTER');
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    const iv = this.configService.get<string>('ENCRYPTION_IV');
    const keyMatch = key.match(/.{1,2}/g) || [];
    const ivMatch = iv.match(/.{1,2}/g) || [];
    this.key = new Uint8Array(keyMatch.map((byte) => parseInt(byte, 16)));
    this.iv = new Uint8Array(ivMatch.map((byte) => parseInt(byte, 16)));
    this.uri = `mongodb+srv://${mongoUser}:${mongoPassword}@${mongoCluster.toLowerCase()}.p8uu3.mongodb.net/?retryWrites=true&w=majority&appName=${mongoCluster}`;
  }

  private encrypt(data: string): string {
    const algorithm = 'aes-256-cbc';
    this.logger.log('Key:', this.key, 'IV:', this.iv);
    const cipher = crypto.createCipheriv(algorithm, this.key, this.iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decrypt(data: string): string {
    const algorithm = 'aes-256-cbc';

    const decipher = crypto.createDecipheriv(algorithm, this.key, this.iv);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      this.logger.debug('Connecting to MongoDB Atlas', this.uri);
      if (!this.client) {
        this.client = new MongoClient(this.uri, {
          serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
          },
        });
        await this.client.connect();
        this.logger.log('Connected to MongoDB Atlas');
      }
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB Atlas', error);
      throw error;
    }
  }

  private async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.logger.log('Disconnected from MongoDB Atlas');
      }
    } catch (error) {
      this.logger.error('Failed to disconnect from MongoDB Atlas', error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  private getQuizCollection() {
    const mongoDB = this.configService.get<string>('MONGO_DB');
    const mongoCollection = this.configService.get<string>('MONGO_COLLECTION');
    return this.client.db(mongoDB).collection(mongoCollection);
  }

  async getDataById(id: string) {
    try {
      const objectId = new ObjectId(id);
      this.logger.log(`Fetching data with ObjectId: ${objectId}`);
      return await this.getQuizCollection().findOne({ _id: objectId });
    } catch (error) {
      this.logger.error('Failed to fetch data by ID', error);
      throw error;
    }
  }

  async getData() {
    try {
      return await this.getQuizCollection().find().toArray();
    } catch (error) {
      this.logger.error('Failed to fetch data', error);
      throw error;
    }
  }

  async getDataByFilter(count: string, tags: string[]) {
    this.logger.log(`Fetching ${count} random questions with tags: ${tags}`);
    try {
      const pipeline = [
        { $match: { tag: { $in: tags } } },
        ...(count !== 'All'
          ? [{ $sample: { size: parseInt(count, 10) } }]
          : []),
      ];
      this.logger.log('Pipeline:', pipeline);
      const results = await this.getQuizCollection()
        .aggregate(pipeline)
        .toArray();
      const encryptedResults = results.map((item) => {
        item.correctAnswer = this.encrypt(item.correctAnswer);
        return item;
      });
      this.logger.log(`Encrypted ${encryptedResults.length} random questions`);
      return encryptedResults;
    } catch (error) {
      this.logger.error('Failed to fetch random questions', error);
      throw error;
    }
  }

  async insertData(data: Quiz) {
    try {
      const quizData = { ...data, _id: new ObjectId(data._id) };
      return await this.getQuizCollection().insertOne(quizData);
    } catch (error) {
      this.logger.error('Failed to insert data', error);
      throw error;
    }
  }

  async insertAllData(data: Quiz[]) {
    try {
      const quizData = data.map((quiz) => ({
        ...quiz,
        _id: new ObjectId(quiz._id),
      }));
      return await this.getQuizCollection().insertMany(quizData);
    } catch (error) {
      this.logger.error('Failed to insert all data', error);
      throw error;
    }
  }

  async deleteData(id: string) {
    try {
      const objectId = new ObjectId(id);
      return await this.getQuizCollection().deleteOne({ _id: objectId });
    } catch (error) {
      this.logger.error('Failed to delete data', error);
      throw error;
    }
  }

  async deleteAllData() {
    try {
      return await this.getQuizCollection().deleteMany({});
    } catch (error) {
      this.logger.error('Failed to delete all data', error);
      throw error;
    }
  }

  async updateData(data: Quiz, update: Partial<Quiz>) {
    try {
      return await this.getQuizCollection().updateOne(
        { _id: new ObjectId(data._id) },
        { $set: update },
      );
    } catch (error) {
      this.logger.error('Failed to update data', error);
      throw error;
    }
  }

  async updateAllData(filter: Partial<Quiz>, update: Partial<Quiz>) {
    try {
      const filterWithObjectId = {
        ...filter,
        _id: filter._id ? new ObjectId(filter._id) : undefined,
      };
      return await this.getQuizCollection().updateMany(filterWithObjectId, {
        $set: update,
      });
    } catch (error) {
      this.logger.error('Failed to update all data', error);
      throw error;
    }
  }
}
