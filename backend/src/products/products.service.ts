import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ProductsEntity } from './products.entity';
import { CreateProductDto, UpdateProductDto } from './products.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductsEntity)
    private readonly productRepo: Repository<ProductsEntity>,
  ) {}

  // Функція для генерації SKU (наприклад: NX-123456)
  private generateSKU(): string {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `NX-${randomDigits}`;
  }

  async create(dto: CreateProductDto): Promise<ProductsEntity> {
    // 1. Перевірка slug
    const existingSlug = await this.productRepo.findOne({ where: { slug: dto.slug } });
    if (existingSlug) throw new BadRequestException('Product slug already exists');

    // 2. Генерація унікального SKU
    let sku = this.generateSKU();
    let isSkuUnique = false;

    // Перевіряємо унікальність SKU (на випадок рідкісного збігу рандому)
    while (!isSkuUnique) {
      const existingSku = await this.productRepo.findOne({ where: { sku } });
      if (!existingSku) {
        isSkuUnique = true;
      } else {
        sku = this.generateSKU();
      }
    }

    const product = this.productRepo.create({
      ...dto,
      sku, // Додаємо згенерований SKU
      catalog: { id: dto.catalogId },
      category: { id: dto.categoryId },
    });

    return await this.productRepo.save(product);
  }

  async findAll(): Promise<ProductsEntity[]> {
    return await this.productRepo.find({
      relations: ['catalog', 'category'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ProductsEntity> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['catalog', 'category'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductsEntity> {
    const product = await this.findOne(id);

    if (dto.slug) {
      const conflict = await this.productRepo.findOne({ where: { slug: dto.slug, id: Not(id) } });
      if (conflict) throw new BadRequestException('Slug already in use');
    }

    const updated = this.productRepo.merge(product, {
      ...dto,
      catalog: dto.catalogId ? { id: dto.catalogId } : product.catalog,
      category: dto.categoryId ? { id: dto.categoryId } : product.category,
    });

    return await this.productRepo.save(updated);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const result = await this.productRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Product not found');
    return { success: true };
  }
}
