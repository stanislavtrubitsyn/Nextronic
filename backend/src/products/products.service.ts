import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ProductsEntity } from './products.entity';
import { CreateProductDto, UpdateProductDto } from './products.dto';
import { CategoriesEntity } from '../categories/categories.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductsEntity)
    private readonly productRepo: Repository<ProductsEntity>,
    @InjectRepository(CategoriesEntity) // Впроваджуємо репозиторій категорій
    private readonly categoryRepo: Repository<CategoriesEntity>,
  ) {}

  private generateSKU(): string {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `NX-${randomDigits}`;
  }

  async create(dto: CreateProductDto): Promise<ProductsEntity> {
    // 1. Перевірка slug
    const existingSlug = await this.productRepo.findOne({ where: { slug: dto.slug } });
    if (existingSlug) throw new BadRequestException('Product slug already exists');

    // 2. АВТОМАТИЧНЕ ОТРИМАННЯ catalogId
    // Шукаємо категорію, щоб взяти її catalogId
    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId },
      relations: ['catalog'], // Переконуємось, що зв'язок завантажений
    });

    if (!category) throw new NotFoundException('Category not found');

    // Якщо catalogId не передано явно, беремо його з категорії
    const finalCatalogId = dto.catalogId || (category.catalog ? category.catalog.id : null);

    if (!finalCatalogId) throw new BadRequestException('Catalog ID could not be determined');

    // 3. Генерація унікального SKU
    let sku = this.generateSKU();
    let isSkuUnique = false;
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
      sku,
      catalog: { id: finalCatalogId },
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

    // Якщо при оновленні змінили категорію, але не дали каталог - підтягуємо каталог за новою категорією
    let finalCatalogId = dto.catalogId;
    if (dto.categoryId && !dto.catalogId) {
      const category = await this.categoryRepo.findOne({
        where: { id: dto.categoryId },
        relations: ['catalog'],
      });
      if (category) finalCatalogId = category.catalog.id;
    }

    const updated = this.productRepo.merge(product, {
      ...dto,
      catalog: finalCatalogId ? { id: finalCatalogId } : product.catalog,
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
