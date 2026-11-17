'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Apple, Plus, Utensils } from 'lucide-react';
import { useDemo, useRepository } from '@/components/providers';
import { useDemoSession } from '@/components/demo-session';
import { PageHeader, Panel, Field, Feedback, EmptyState, Stat } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TrendChart } from '@/components/charts';
import { PageMotion } from '@/components/motion';
import { DEMO_DATE } from '@/domain/types';
import {
  gramsFor,
  foodNutrients,
  mealNutrients,
  totalNutrients,
  type Meal,
  type Nutrients,
} from '@/domain/experience';
import {
  foodsFor,
  newId,
  recipeFood,
  saveFood,
  saveMeal,
  sharedMeals,
  PERSONAL_FUEL_ID,
} from '@/services/experience-service';
import { errorMessage } from '@/domain/schemas';
import { normalize, formatDate } from '@/domain/selectors';

const mealsNames = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia', 'Personalizada'];
const fields = [
  ['kcal', 'Energia', 'kcal'],
  ['protein', 'Proteínas', 'g'],
  ['carbs', 'Carboidratos', 'g'],
  ['fat', 'Gorduras', 'g'],
] as const;
const display = (value: number | null) =>
  value === null ? 'Não disponível' : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
export function FuelOverview({ personal = false }: { personal?: boolean }) {
  const data = useDemo();
  const { studentId } = useDemoSession();
  const meals = sharedMeals(
    data,
    personal ? 'personal' : 'aluno',
    personal ? PERSONAL_FUEL_ID : studentId,
  ).filter((m) => m.date === DEMO_DATE && m.items.length > 0);
  return (
    <Panel className="module-panel section-gap fuel-overview">
      <h2>Minha alimentação</h2>
      <p>{meals.length} refeições registradas hoje no seu diário individual.</p>
      <Link className="text-link" href={personal ? '/personal/alimentacao' : '/aluno/alimentacao'}>
        Abrir meu diário alimentar
      </Link>
    </Panel>
  );
}
function Numbers({ values }: { values: Nutrients }) {
  return (
    <div className="nutrition-numbers">
      {fields.map(([key, label, unit]) => (
        <span key={key}>
          {label}
          <strong>
            {display(values[key])} {values[key] === null ? '' : unit}
          </strong>
        </span>
      ))}
    </div>
  );
}
export function FuelPage({ personal: personalAccount = false }: { personal?: boolean }) {
  const personal = false;
  const data = useDemo();
  const repository = useRepository();
  const { studentId } = useDemoSession();
  const id = personalAccount ? PERSONAL_FUEL_ID : studentId;
  const [date, setDate] = useState(DEMO_DATE);
  const [modal, setModal] = useState<'meal' | 'item' | 'food' | 'recipe' | 'summary' | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyRecent, setOnlyRecent] = useState(false);
  const [target, setTarget] = useState('');
  const [selectedFood, setSelectedFood] = useState('');
  const [selectingFood, setSelectingFood] = useState(true);
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState('g');
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [ingredients, setIngredients] = useState<{ foodId: string; grams: number }[]>([]);
  const minor = false;
  const showNumbers = true;
  const allowed = true;
  const foods = foodsFor(data, id);
  const history = sharedMeals(data, personalAccount ? 'personal' : 'aluno', id);
  const meals = history.filter((meal) => meal.date === date);
  const favorites = data.experience.favorites[id] ?? [];
  const total = totalNutrients(
    meals.flatMap((meal) =>
      meal.items.map((item) => {
        const food = foods.find((food) => food.id === item.foodId);
        return food
          ? foodNutrients(food, item.grams)
          : { kcal: null, protein: null, carbs: null, fat: null };
      }),
    ),
  );
  const food = foods.find((item) => item.id === selectedFood);
  let grams: number | null = null;
  try {
    if (food) grams = gramsFor(food, quantity, unit);
  } catch {
    /* Validation is also enforced at save. */
  }
  const act = (action: () => void) => {
    setError('');
    setFeedback('');
    try {
      action();
    } catch (error) {
      setError(errorMessage(error));
    }
  };
  function openItem(mealId = '', item?: Meal['items'][number]) {
    setTarget(mealId);
    setSelectedFood(item?.foodId ?? '');
    setSelectingFood(!item);
    setQuantity(item?.quantity ?? 100);
    setUnit(item?.unit ?? 'g');
    setEditing(item?.id ?? null);
    setQuery('');
    setError('');
    setModal('item');
  }
  function duplicate(meal: Meal) {
    act(() => {
      saveMeal(
        repository,
        {
          ...structuredClone(meal),
          id: '',
          date,
          name: meal.name,
          items: meal.items.map((item) => ({ ...item, id: newId() })),
        },
        id,
      );
      setFeedback('Refeição copiada para a data selecionada.');
    });
  }
  function saveCustom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    act(() => {
      const values = new FormData(event.currentTarget);
      const reference = Number(values.get('reference'));
      const nutrients = Object.fromEntries(
        fields.map(([key]) => [
          key,
          minor || values.get(key) === '' ? null : Number(values.get(key)),
        ]),
      ) as Nutrients;
      saveFood(
        repository,
        {
          id: '',
          name: String(values.get('name')),
          brand: String(values.get('brand') ?? ''),
          category: 'Outros',
          source: '',
          sourceId: '',
          portions: [{ label: 'Porção informada', grams: reference }],
          per100g: nutrients,
        },
        id,
        reference,
      );
      setModal(null);
      setFeedback('Alimento personalizado salvo. Dados identificados como informados por você.');
    });
  }
  const dates = [...new Set([...history.map((meal) => meal.date), date])].sort().slice(-7);
  const foodResults = foods.filter(
    (food) =>
      normalize(`${food.name} ${food.brand}`).includes(normalize(query)) &&
      (category === 'all' || food.category === category) &&
      (!onlyFavorites || favorites.includes(food.id)) &&
      (!onlyRecent || history.some((meal) => meal.items.some((item) => item.foodId === food.id))),
  );
  return (
    <>
      <PageHeader
        eyebrow="MOVRA Fuel · registro alimentar"
        title={personalAccount ? 'Meu diário alimentar' : 'Um registro do seu dia.'}
        description="Diário informativo com estimativas de composição. Sem dieta, metas calóricas, julgamentos ou compensação com exercícios."
        action={
          !personal ? (
            <Button
              onClick={() => {
                setError('');
                openItem(meals[0]?.id ?? '');
              }}
            >
              <Plus size={16} />
              Adicionar alimento
            </Button>
          ) : undefined
        }
      />
      <div className="module-hero">
        <Apple size={32} aria-hidden />
        <div>
          <p className="eyebrow">Alimentação, com contexto</p>
          <h2>Registrar para conversar.</h2>
          <p>
            Registre sua alimentação. As estimativas representam energia e nutrientes ingeridos, não
            gasto com exercícios. O personal não acessa o diário dos alunos.
          </p>
        </div>
      </div>
      <div className="toolbar module-toolbar">
        <Field label="Data do diário" htmlFor="fuel-date">
          <Input
            id="fuel-date"
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </Field>
      </div>

      <Feedback error={error} success={feedback} />
      {!allowed ? (
        <EmptyState
          title="Este diário não foi compartilhado."
          description="O personal só visualiza registros quando o próprio aluno ativa o compartilhamento. Nenhuma informação privada é exibida aqui."
        />
      ) : (
        <>
          <PageMotion
            focusPage={false}
            route={`fuel-${id}-${date}-${meals.length}-${Object.values(total.values).join('-')}`}
          >
            <div className="stats-grid">
              <Stat
                label="Refeições registradas"
                value={meals.filter((meal) => meal.items.length > 0).length}
                note={formatDate(date)}
              />
              <Stat
                label="Alimentos registrados"
                value={meals.reduce((sum, meal) => sum + meal.items.length, 0)}
                note="Itens apenas desta data"
              />
              {showNumbers && (
                <>
                  <Stat
                    label="Energia estimada"
                    value={
                      total.values.kcal === null ? 'Parcial' : `${display(total.values.kcal)} kcal`
                    }
                    note="Soma dos registros; não é meta"
                  />
                  <Stat
                    label="Proteínas estimadas"
                    value={
                      total.values.protein === null
                        ? 'Parcial'
                        : `${display(total.values.protein)} g`
                    }
                    note="Quantidades informadas"
                  />
                </>
              )}
            </div>
            {showNumbers && (
              <Panel className="module-panel">
                <h2>Estimativas do dia</h2>
                <Numbers values={total.values} />
                {total.partial && (
                  <p role="status" className="form-help">
                    Estimativa parcial: há nutrientes desconhecidos. Eles não foram tratados como
                    zero confirmado.
                  </p>
                )}
              </Panel>
            )}
          </PageMotion>
          {!personal && (
            <div className="module-nav">
              <Button
                variant="outline"
                onClick={() => {
                  setError('');
                  setModal('meal');
                }}
              >
                Adicionar refeição
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setError('');
                  setModal('food');
                }}
              >
                Cadastrar alimento
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setError('');
                  setIngredients([]);
                  setModal('recipe');
                }}
              >
                Criar receita
              </Button>
              <Field label="Copiar refeição anterior ou favorita" htmlFor="fuel-copy">
                <select
                  id="fuel-copy"
                  className="native-select"
                  value=""
                  onChange={(e) => {
                    const meal = history.find((meal) => meal.id === e.target.value);
                    if (meal) duplicate(meal);
                  }}
                >
                  <option value="">Escolher refeição</option>
                  {history
                    .filter((meal) => meal.items.length > 0)
                    .map((meal) => (
                      <option key={meal.id} value={meal.id}>
                        {meal.favorite ? '★ ' : ''}
                        {meal.date} · {meal.name}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
          )}
          <div className="fuel-meals">
            {meals.map((meal) => (
              <Panel key={meal.id} className="meal-card">
                <details open>
                  <summary>
                    <span>
                      <Utensils size={19} aria-hidden />
                      {meal.name}
                    </span>
                    <span>
                      {meal.items.length} alimentos {meal.favorite ? '· favorita' : ''}
                    </span>
                  </summary>
                  <div className="module-panel">
                    {meal.note && <p>{meal.note}</p>}
                    {meal.items.map((item) => {
                      const food = foods.find((food) => food.id === item.foodId);
                      return (
                        <article className="food-row" key={item.id}>
                          <div>
                            <h3>{food?.name ?? 'Alimento não disponível'}</h3>
                            <p>
                              {item.quantity} {item.unit} · {display(item.grams)} g
                            </p>
                            {showNumbers && food && (
                              <Numbers values={foodNutrients(food, item.grams)} />
                            )}
                          </div>
                          {!personal && (
                            <div className="form-actions">
                              <Button
                                variant="ghost"
                                aria-label={`Editar ${food?.name}`}
                                onClick={() => openItem(meal.id, item)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                aria-label={`Duplicar ${food?.name}`}
                                onClick={() =>
                                  act(() => {
                                    saveMeal(
                                      repository,
                                      { ...meal, items: [...meal.items, { ...item, id: newId() }] },
                                      id,
                                    );
                                  })
                                }
                              >
                                Duplicar item
                              </Button>
                              <Button
                                variant="ghost"
                                aria-label={`Excluir ${food?.name}`}
                                onClick={() =>
                                  act(() => {
                                    saveMeal(
                                      repository,
                                      {
                                        ...meal,
                                        items: meal.items.filter((row) => row.id !== item.id),
                                      },
                                      id,
                                    );
                                  })
                                }
                              >
                                Excluir item
                              </Button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                    {!meal.items.length && (
                      <p className="form-help">Esta refeição ainda não tem alimentos.</p>
                    )}
                    {!personal && (
                      <>
                        <Field label="Nome da refeição" htmlFor={`meal-name-${meal.id}`}>
                          <Input
                            id={`meal-name-${meal.id}`}
                            defaultValue={meal.name}
                            maxLength={100}
                            onBlur={(e) => {
                              if (e.target.value !== meal.name)
                                act(() => {
                                  saveMeal(repository, { ...meal, name: e.target.value }, id);
                                  setFeedback('Nome da refeição atualizado.');
                                });
                            }}
                          />
                        </Field>
                        <Field
                          label="Observações da refeição (opcional)"
                          htmlFor={`meal-note-${meal.id}`}
                        >
                          <Textarea
                            id={`meal-note-${meal.id}`}
                            defaultValue={meal.note}
                            maxLength={500}
                            onBlur={(e) => {
                              if (e.target.value !== meal.note)
                                act(() => {
                                  saveMeal(repository, { ...meal, note: e.target.value }, id);
                                  setFeedback('Observação salva.');
                                });
                            }}
                          />
                        </Field>
                        <div className="form-actions">
                          <Button variant="outline" onClick={() => openItem(meal.id)}>
                            Adicionar nesta refeição
                          </Button>
                          <Button variant="outline" onClick={() => duplicate(meal)}>
                            Duplicar refeição
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              act(() => {
                                saveMeal(repository, { ...meal, favorite: !meal.favorite }, id);
                              })
                            }
                          >
                            {meal.favorite ? 'Remover favorita' : 'Salvar refeição favorita'}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              repository.updateExperience((state) => ({
                                ...state,
                                meals: state.meals.filter(
                                  (m) => m.id !== meal.id || m.studentId !== id,
                                ),
                              }))
                            }
                          >
                            Excluir refeição
                          </Button>
                        </div>
                      </>
                    )}
                    {showNumbers && (
                      <>
                        <p className="eyebrow">Estimativa da refeição</p>
                        <Numbers values={mealNutrients(meal, foods).values} />
                      </>
                    )}
                  </div>
                </details>
              </Panel>
            ))}
          </div>
          {!meals.length && (
            <EmptyState
              title="Uma página aberta para o seu dia."
              description="Nenhum registro nesta data. Não é uma avaliação da sua alimentação."
              action={
                !personal ? (
                  <Button onClick={() => openItem()}>Registrar primeiro alimento</Button>
                ) : undefined
              }
            />
          )}
          <div className="module-grid">
            <Panel
              className="module-panel"
              title="Frequência de registros"
              description="Refeições com alimentos nas últimas datas disponíveis; não mede qualidade alimentar"
            >
              <TrendChart
                label="Refeições registradas"
                unit="refeições"
                kind="bar"
                data={dates.map((day) => ({
                  label: formatDate(day),
                  value: history.filter((meal) => meal.date === day && meal.items.length > 0)
                    .length,
                }))}
              />
            </Panel>
            <Panel className="module-panel">
              <h2>Seu registro, sem metas automáticas.</h2>
              <p>
                Treino e alimentação são acompanhamentos distintos. Este módulo não recomenda dieta,
                suplementos, déficit ou superávit.
              </p>
              <Button variant="outline" onClick={() => setModal('summary')}>
                Visualizar resumo demonstrativo
              </Button>
              <p className="form-help">
                Catálogo: USDA FoodData Central SR Legacy 04/2018, domínio público/CC0. Nomes
                traduzidos para consulta; preparações e composição podem diferir dos alimentos
                brasileiros. Não é uma cópia da TBCA.
              </p>
              <a
                className="text-link"
                href="https://fdc.nal.usda.gov/api-guide/"
                target="_blank"
                rel="noreferrer"
              >
                Fonte e condições USDA
              </a>
            </Panel>
          </div>
        </>
      )}
      <Dialog
        open={modal === 'meal'}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar refeição</DialogTitle>
            <DialogDescription>Uma refeição descritiva para {formatDate(date)}.</DialogDescription>
          </DialogHeader>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              act(() => {
                saveMeal(
                  repository,
                  {
                    id: '',
                    studentId: id,
                    date,
                    name:
                      form.get('kind') === 'Personalizada'
                        ? String(form.get('custom'))
                        : String(form.get('kind')),
                    note: '',
                    favorite: false,
                    items: [],
                  },
                  id,
                );
                setModal(null);
                setFeedback('Refeição criada. Adicione os alimentos quando quiser.');
              });
            }}
          >
            <Field label="Tipo de refeição" htmlFor="meal-kind">
              <select id="meal-kind" name="kind" className="native-select">
                {mealsNames.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </Field>
            <Field label="Nome para refeição personalizada" htmlFor="meal-custom">
              <Input
                id="meal-custom"
                name="custom"
                maxLength={100}
                placeholder="Ex.: Refeição após o encontro"
              />
            </Field>
            <Feedback error={error} />
            <Button type="submit">Criar refeição</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === 'item'}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="fuel-food-dialog">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar alimento registrado' : 'Adicionar alimento'}
            </DialogTitle>
            <DialogDescription>
              Selecione um alimento e informe a quantidade consumida. Conversões são específicas de
              cada item.
            </DialogDescription>
          </DialogHeader>
          {selectingFood && (
            <>
              <Field label="Buscar alimento" htmlFor="food-query">
                <Input
                  id="food-query"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </Field>
              <div className="form-grid">
                <Field label="Categoria alimentar" htmlFor="food-category">
                  <select
                    id="food-category"
                    className="native-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="all">Todas as categorias</option>
                    {[...new Set(foods.map((food) => food.category))].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </Field>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={onlyFavorites}
                    onChange={(e) => setOnlyFavorites(e.target.checked)}
                  />
                  Somente favoritos
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={onlyRecent}
                    onChange={(event) => setOnlyRecent(event.target.checked)}
                  />
                  Utilizados recentemente
                </label>
              </div>
              <Field label="Alimento da biblioteca" htmlFor="food-select">
                <select
                  id="food-select"
                  className="native-select"
                  size={4}
                  value={selectedFood}
                  onChange={(e) => {
                    setSelectedFood(e.target.value);
                    setUnit('g');
                    setQuantity(100);
                    setSelectingFood(false);
                    requestAnimationFrame(() => document.getElementById('food-quantity')?.focus());
                  }}
                >
                  {foodResults.map((food) => (
                    <option key={food.id} value={food.id}>
                      {food.name}
                      {food.ownerId ? ' · personalizado' : ''}
                    </option>
                  ))}
                </select>
              </Field>
              {!foodResults.length && (
                <p role="status">
                  Nenhum alimento corresponde à busca. Feche e use Cadastrar alimento.
                </p>
              )}
            </>
          )}
          {food && (
            <>
              <div className="selected-food">
                <strong>{food.name}</strong>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectingFood(true);
                    requestAnimationFrame(() => document.getElementById('food-query')?.focus());
                  }}
                >
                  Trocar alimento
                </Button>
              </div>
              <details className="food-provenance">
                <summary>Origem e favoritos</summary>
                <p className="form-help">{food.source}</p>
                {food.sourceId && (
                  <a className="text-link" href={food.sourceId} target="_blank" rel="noreferrer">
                    Consultar origem do alimento
                  </a>
                )}
                <Button
                  variant="ghost"
                  onClick={() =>
                    repository.updateExperience((state) => ({
                      ...state,
                      favorites: {
                        ...state.favorites,
                        [id]: favorites.includes(food.id)
                          ? favorites.filter((value) => value !== food.id)
                          : [...favorites, food.id],
                      },
                    }))
                  }
                >
                  {favorites.includes(food.id)
                    ? 'Remover alimento favorito'
                    : 'Salvar alimento favorito'}
                </Button>
              </details>
            </>
          )}
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => {
                if (!food) throw new Error('Selecione um alimento.');
                const base = history.find((meal) => meal.id === target) ?? {
                  id: '',
                  studentId: id,
                  date,
                  name: 'Lanche',
                  note: '',
                  favorite: false,
                  items: [],
                };
                const item = { id: editing ?? newId(), foodId: food.id, quantity, unit, grams: 0 };
                saveMeal(
                  repository,
                  {
                    ...base,
                    items: editing
                      ? base.items.map((row) => (row.id === editing ? item : row))
                      : [...base.items, item],
                  },
                  id,
                );
                setModal(null);
                setFeedback('Alimento registrado. O resumo foi atualizado.');
              });
            }}
          >
            <Field label="Refeição de destino" htmlFor="food-target">
              <select
                id="food-target"
                className="native-select"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={!!editing}
              >
                <option value="">Nova refeição · Lanche</option>
                {meals.map((meal) => (
                  <option key={meal.id} value={meal.id}>
                    {meal.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-grid">
              <Field label="Quantidade" htmlFor="food-quantity">
                <Input
                  id="food-quantity"
                  type="number"
                  min="0.01"
                  max={10000}
                  step="any"
                  required
                  value={Number.isFinite(quantity) ? quantity : ''}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </Field>
              <Field label="Unidade da quantidade" htmlFor="food-unit">
                <select
                  id="food-unit"
                  className="native-select"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="g">Gramas</option>
                  {food?.portions.map((portion) => (
                    <option key={portion.label} value={portion.label}>
                      {portion.label} · {portion.grams} g
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {grams !== null && (
              <p className="form-help">
                Quantidade equivalente: {display(grams)} g. Não se presume conversão de ml para g.
              </p>
            )}
            {food && grams !== null && showNumbers && (
              <Numbers values={foodNutrients(food, grams)} />
            )}
            <Feedback error={error} />
            <Button type="submit" disabled={!food}>
              {editing ? 'Atualizar alimento' : 'Registrar alimento'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === 'food'}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar alimento personalizado</DialogTitle>
            <DialogDescription>
              Valores do rótulo ou informados por você, sem atribuição à TBCA ou USDA. Campo vazio
              representa dado desconhecido.
            </DialogDescription>
          </DialogHeader>
          <form className="form-stack" onSubmit={saveCustom}>
            <Field label="Nome do alimento" htmlFor="custom-food-name">
              <Input id="custom-food-name" name="name" required minLength={2} maxLength={120} />
            </Field>
            <Field label="Marca (opcional)" htmlFor="custom-food-brand">
              <Input id="custom-food-brand" name="brand" maxLength={100} />
            </Field>
            <Field label="Porção de referência em gramas" htmlFor="custom-food-reference">
              <Input
                id="custom-food-reference"
                name="reference"
                type="number"
                min="0.01"
                max={10000}
                step="any"
                defaultValue={100}
                required
              />
            </Field>
            {!minor && (
              <fieldset>
                <legend>Nutrientes na porção de referência</legend>
                <div className="form-grid">
                  {fields.map(([key, label, unit]) => (
                    <Field key={key} label={`${label} (${unit})`} htmlFor={`custom-${key}`}>
                      <Input
                        id={`custom-${key}`}
                        name={key}
                        type="number"
                        min={0}
                        max={10000}
                        step="any"
                        placeholder="Desconhecido"
                      />
                    </Field>
                  ))}
                </div>
              </fieldset>
            )}
            <Feedback error={error} />
            <Button type="submit">Salvar alimento personalizado</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === 'recipe'}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receita com ingredientes</DialogTitle>
            <DialogDescription>
              Informe os pesos dos ingredientes e o peso final real após preparo. Não se assume que
              o rendimento equivale ao peso cru.
            </DialogDescription>
          </DialogHeader>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              act(() => {
                const recipe = recipeFood(
                  foods,
                  ingredients,
                  Number(form.get('yield')),
                  String(form.get('name')),
                );
                saveFood(repository, recipe, id);
                setModal(null);
                setFeedback(
                  'Receita salva como alimento personalizado. Adicione a quantidade consumida ao diário.',
                );
              });
            }}
          >
            <Field label="Nome da receita" htmlFor="recipe-name">
              <Input id="recipe-name" name="name" required minLength={2} />
            </Field>
            <Field label="Adicionar ingrediente" htmlFor="recipe-add">
              <select
                id="recipe-add"
                className="native-select"
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    setIngredients([...ingredients, { foodId: e.target.value, grams: 100 }]);
                }}
              >
                <option value="">Selecione o ingrediente</option>
                {foods.map((food) => (
                  <option key={food.id} value={food.id}>
                    {food.name}
                  </option>
                ))}
              </select>
            </Field>
            {ingredients.map((ingredient, index) => (
              <div className="form-actions" key={index}>
                <Field
                  label={`${foods.find((food) => food.id === ingredient.foodId)?.name} (g)`}
                  htmlFor={`ingredient-${index}`}
                >
                  <Input
                    id={`ingredient-${index}`}
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={ingredient.grams}
                    onChange={(e) =>
                      setIngredients(
                        ingredients.map((item, i) =>
                          i === index ? { ...item, grams: Number(e.target.value) } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))}
                >
                  Remover ingrediente {index + 1}
                </Button>
              </div>
            ))}
            <Field label="Peso final da receita pronta (g)" htmlFor="recipe-yield">
              <Input id="recipe-yield" name="yield" type="number" min="0.01" step="any" required />
            </Field>
            <Feedback error={error} />
            <Button type="submit">Salvar receita</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === 'summary'}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resumo demonstrativo</DialogTitle>
            <DialogDescription>
              {formatDate(date)} ·{' '}
              {personalAccount
                ? data.profiles.personal.name
                : data.students.find((student) => student.id === id)?.name}
              . Somente os registros do seu diário individual.
            </DialogDescription>
          </DialogHeader>
          {allowed && (
            <>
              <ul>
                {meals.map((meal) => (
                  <li key={meal.id}>
                    <strong>{meal.name}</strong>:{' '}
                    {meal.items
                      .map(
                        (item) =>
                          `${foods.find((food) => food.id === item.foodId)?.name} (${display(item.grams)} g)`,
                      )
                      .join(', ')}
                  </li>
                ))}
              </ul>
              {showNumbers && <Numbers values={total.values} />}
              <Button
                variant="outline"
                onClick={() => {
                  const result = {
                    date,
                    studentId: id,
                    meals: meals.map((meal) => ({
                      name: meal.name,
                      note: meal.note,
                      items: meal.items.map((item) => ({
                        name: foods.find((food) => food.id === item.foodId)?.name,
                        grams: item.grams,
                      })),
                    })),
                    ...(showNumbers ? { estimatedNutrients: total } : {}),
                    notice: 'Resumo demonstrativo informativo, sem prescrição dietética.',
                  };
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }),
                  );
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `movra-fuel-${date}.json`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Exportar resumo JSON
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
