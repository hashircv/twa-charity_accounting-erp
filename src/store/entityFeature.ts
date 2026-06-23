import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice,
  type EntityState,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { BaseEntity } from "@/types/domain";
import type { Repository } from "@/services/repositories/Repository";

export interface LoadableEntityState<T extends BaseEntity> extends EntityState<T, string> {
  status: "idle" | "loading" | "succeeded" | "failed";
  error?: string;
  selectedId?: string;
}

export const createEntityFeature = <T extends BaseEntity>(name: string, repository: Repository<T>) => {
  const adapter = createEntityAdapter<T, string>({
    selectId: (entity) => entity.id,
  });

  const fetchAll = createAsyncThunk(`${name}/fetchAll`, () => repository.list());
  const createOne = createAsyncThunk(`${name}/createOne`, (entity: Omit<T, keyof BaseEntity>) => repository.create(entity));
  const updateOne = createAsyncThunk(`${name}/updateOne`, ({ id, patch }: { id: string; patch: Partial<T> }) =>
    repository.update(id, patch),
  );
  const deleteOne = createAsyncThunk(`${name}/deleteOne`, ({ id, deletedBy }: { id: string; deletedBy: string }) =>
    repository.softDelete(id, deletedBy),
  );

  const slice = createSlice({
    name,
    initialState: adapter.getInitialState({
      status: "idle",
      error: undefined,
      selectedId: undefined,
    }) as LoadableEntityState<T>,
    reducers: {
      selected(state, action: PayloadAction<string | undefined>) {
        state.selectedId = action.payload;
      },
      upserted(state, action: PayloadAction<T>) {
        adapter.upsertOne(state, action.payload);
      },
      removed(state, action: PayloadAction<string>) {
        adapter.removeOne(state, action.payload);
      },
    },
    extraReducers: (builder) => {
      builder
        .addCase(fetchAll.pending, (state) => {
          state.status = "loading";
        })
        .addCase(fetchAll.fulfilled, (state, action) => {
          state.status = "succeeded";
          adapter.setAll(state, action.payload);
        })
        .addCase(fetchAll.rejected, (state, action) => {
          state.status = "failed";
          state.error = action.error.message;
        })
        .addCase(createOne.fulfilled, (state, action) => {
          adapter.addOne(state, action.payload);
        })
        .addCase(updateOne.fulfilled, (state, action) => {
          adapter.upsertOne(state, action.payload);
        })
        .addCase(deleteOne.fulfilled, (state, action) => {
          adapter.removeOne(state, action.payload.id);
        });
    },
  });

  return { adapter, fetchAll, createOne, updateOne, deleteOne, reducer: slice.reducer, actions: slice.actions };
};
