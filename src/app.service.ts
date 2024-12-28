import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { Quiz } from './app.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient;
  private readonly uri: string;
  private readonly logger = new Logger(AppService.name);

  constructor(private configService: ConfigService) {
    const mongoUser = this.configService.get<string>('MONGO_USER');
    const mongoPassword = this.configService.get<string>('MONGO_PASSWORD');
    const mongoCluster = this.configService.get<string>('MONGO_CLUSTER');
    this.uri = `mongodb+srv://${mongoUser}:${mongoPassword}@${mongoCluster.toLowerCase()}.p8uu3.mongodb.net/?retryWrites=true&w=majority&appName=${mongoCluster}`;
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      this.logger.log('Connecting to MongoDB Atlas', this.uri);
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
      this.logger.log(`Fetched ${results.length} random questions`);
      return results;
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
